import { resourceTypesRoute, rolesRoute, schemasRoute, scopesRoute } from './entitlements';
import { Router } from 'express';
export const scimRoute = Router();
import { Prisma, PrismaClient, User } from '@prisma/client';
import { IErrorResponse, IListResponse, IScimUser, SCHEMA_ERROR_RESPONSE, SCHEMA_LIST_RESPONSE, SCHEMA_USER, SCIMRequestQuery } from './scim-types';

const prisma = new PrismaClient();

const defaultUserSchema: IScimUser = {
  schemas: [SCHEMA_USER],
  locale: 'en-US',
  emails: [],
  groups: [],
  meta: {
    resourceType: 'User'
  }
};

// POST /scim/v2/Users
// RFC Notes on Creating Users: https://www.rfc-editor.org/rfc/rfc7644#section-3.3
scimRoute.post('/Users', async (req, res) => {
  const orgId = parseInt(req.authInfo as string ?? '');
  const requestUser: IScimUser = req.body;
  const { active, emails, externalId, name, password } = requestUser;

  const givenName = name?.givenName ?? 'NAME';
  const familyName = name?.familyName ?? 'MISSING';
  const displayName = `${givenName} ${familyName}`;

  const email = emails.find(email => email.primary === true)?.value!;

  let newUser;
  try {
    newUser = await prisma.user.create({
      data: {
        org: { connect: { id: orgId } },
        name: displayName,
        email,
        password,
        externalId,
        active,
        roles: {
          connect: requestUser.roles?.map(role => ({ id: parseInt(role.value) })) || []
        }
      },
      include: {
        roles: true
      }
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {

      // externalId + orgId = user uniqueness per SCIM RFC Section 3.3
      const status = 409;
      const errorRes: IErrorResponse = {
        schemas: [SCHEMA_ERROR_RESPONSE],
        detail: `User already exists in the database: ${externalId}`,
        status
      };

      res.status(status).json(errorRes);
    } else {
      res.status(500);
    }
    return;
  }

  const userRes: IScimUser = {
    ...defaultUserSchema,
    id: newUser?.id.toString(),
    userName: newUser?.email,
    name: {
      givenName,
      familyName
    },
    emails: [{
      primary: true,
      value: newUser?.email ?? '',
      type: "work"
    }],
    displayName: newUser?.name,
    externalId: newUser?.externalId ?? undefined,
    active: newUser?.active ?? false,
    roles: newUser?.roles.map(role => ({ display: role.name, value: role.id.toString() }))
  };

  res.status(201).json(userRes);
});


// GET /scim/v2/Users
// RFC Notes on Retrieving Users: https://www.rfc-editor.org/rfc/rfc7644#section-3.4.1
scimRoute.get('/Users', async (req, res) => {

  const orgId = parseInt(req.authInfo as string ?? '');

  // RFC Notes on Pagination: https://www.rfc-editor.org/rfc/rfc7644#section-3.4.2.4
  const query = new SCIMRequestQuery(req.query);

  let where: { org: {}, email?: string } = {
    org: {
      id: orgId
    }
  };

  if (query.filter?.value) {
    where = { ...where, email: query.filter?.value };
  }

  const users = await prisma.user.findMany({
    take: query.count,
    skip: query.startIndex - 1,
    select: {
      id: true,
      email: true,
      name: true,
      externalId: true,
      active: true,
      roles: true
    },
    where
  });

  const Resources: IScimUser[] = users.map(user => {
    const [givenName, familyName] = user.name.split(" ")
    return {
      ...defaultUserSchema,
      id: user.id.toString(),
      userName: user.email,
      name: {
        givenName,
        familyName
      },
      emails: [{
        primary: true,
        value: user.email,
        type: 'work'
      }],
      displayName: user.name,
      externalId: user.externalId ?? undefined,
      active: user.active ?? false,
      roles: user.roles.map(role => ({ display: role.name, value: role.id.toString() }))
    }
  });

  const totalResults = await prisma.user.count({ where });

  const usersResponse: IListResponse<IScimUser> = {
    schemas: [SCHEMA_LIST_RESPONSE],
    totalResults,
    startIndex: query.startIndex,
    itemsPerPage: Resources.length,
    Resources
  };

  return res.json(usersResponse);
});

// GET /scim/v2/Users/{userId}
// RFC Notes on Retrieving Users by ID: https://www.rfc-editor.org/rfc/rfc7644#section-3.4.1
scimRoute.get('/Users/:userId', async (req, res) => {
  const id = parseInt(req.params.userId);
  const orgId = parseInt(req.authInfo as string ?? '');

  let user;

  try {
    user = await prisma.user.findUniqueOrThrow({
      select: {
        id: true,
        email: true,
        name: true,
        externalId: true,
        active: true,
        roles: true
      },
      where: {
        id,
        org: { id: orgId },
      }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      const status = 404;
      const errResponse: IErrorResponse = {
        schemas: [SCHEMA_ERROR_RESPONSE],
        status,
        detail: `User ${id} not found`
      };

      res.status(status).json(errResponse);
    } else {
      res.status(500);
    }

    return;
  }

  const { name, email } = user!;
  const [givenName, familyName] = name.split(" ")
  const userResponse: IScimUser = {
    ...defaultUserSchema,
    id: id.toString(),
    userName: email,
    name: {
      givenName,
      familyName
    },
    emails: [{
      primary: true,
      value: email,
      type: 'work'
    }],
    displayName: name,
    externalId: user!.externalId ?? undefined,
    active: user!.active ?? false,
    roles: user!.roles.map(role => ({ display: role.name, value: role.id.toString() }))
  }

  return res.json(userResponse);
});

// PUT /scim/v2/Users/{userId}
// RFC Notes on Updating a User: https://www.rfc-editor.org/rfc/rfc7644#section-3.5.1
scimRoute.put('/Users/:userId', async (req, res) => {
  const id = parseInt(req.params.userId);
  const { name, emails, roles } = req.body as IScimUser;

  let updatedUser: User;
  try {
    updatedUser = await prisma.user.update({
      data: {
        email: emails?.find(email => email.primary)?.value,
        name: `${name!.givenName} ${name!.familyName}`,
        roles: {
          set: roles?.map(role => ({ id: parseInt(role.value) })) || []
        }
      },
      where: {
        id
      },
      include: {
        roles: true
      }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      const status = 404;
      const errorRes: IErrorResponse = {
        schemas: [SCHEMA_ERROR_RESPONSE],
        detail: `User ${id} not found`,
        status
      };
      res.status(status).json(errorRes);
    } else {
      res.status(500);
    }

    return;
  }

  const [givenName, familyName] = updatedUser!.name.split(" ")
  const userResponse: IScimUser = {
    ...defaultUserSchema,
    id: id.toString(),
    userName: updatedUser!.email,
    name: {
      givenName,
      familyName
    },
    emails: [{
      primary: true,
      value: updatedUser!.email,
      type: 'work'
    }],
    displayName: updatedUser!.name,
    externalId: updatedUser!.externalId ?? undefined,
    active: updatedUser!.active ?? false,
    roles: updatedUser!.roles?.map(role => ({ display: role.name, value: role.id.toString() }))
  };

  return res.json(userResponse);
});

// DELETE: /Users/:userId
// RFC Notes on Deleting Users: https://www.rfc-editor.org/rfc/rfc7644#section-3.6
scimRoute.delete('/Users/:userId', async (req, res) => {
  const id = parseInt(req.params.userId);
  await prisma.user.delete({
    where: { id }
  });

  return res.sendStatus(204);
});

// Soft Delete Users
// PATCH: /Users/:userId
// RFC Notes on Partial Update: https://www.rfc-editor.org/rfc/rfc7644#section-3.5.2
// Note: this does not a true "delete", this will update the active flag to false (this is an Okta best practice)
scimRoute.patch('/Users/:userId', async (req, res) => {
  const id = parseInt(req.params.userId);
  const active = req.body["Operations"][0]["value"]["active"]

  try {
    await prisma.user.update({
      data: {
        active
      },
      where: { id }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      const status = 404;
      const errorRes: IErrorResponse = {
        schemas: [SCHEMA_ERROR_RESPONSE],
        detail: `User ${id} not found`,
        status
      };

      res.status(status).json(errorRes);
    } else {
      res.status(500);
    }

    return;
  }

  return res.sendStatus(204);
});

scimRoute.use('/Roles', rolesRoute);
scimRoute.use('/ResourceTypes', resourceTypesRoute);
scimRoute.use('/Schemas', schemasRoute);
scimRoute.use('/Scopes', scopesRoute);
