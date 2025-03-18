import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  IListResponse,
  IOktaRole,
  IResourceType,
  ISchema,
  IScope,
  SCHEMA_LIST_RESPONSE,
  SCHEMA_OKTA_ENTITLEMENT,
  SCHEMA_OKTA_ROLE,
  SCHEMA_RESOURCE_TYPE,
  SCHEMA_SCOPE,
  SCIMRequestQuery
} from './scim-types';

const prisma = new PrismaClient();
export const rolesRoute = Router();
export const resourceTypesRoute = Router();
export const schemasRoute = Router();
export const scopesRoute = Router();


rolesRoute.route('/')
.get(async (req, res) => {
  const {count, startIndex} = new SCIMRequestQuery(req.query);

  const roles = await prisma.role.findMany({
    take: count,
    skip: startIndex - 1
  });

  const listResponse: IListResponse<IOktaRole> = {
    schemas: [SCHEMA_LIST_RESPONSE],
    totalResults: roles.length,
    startIndex,
    itemsPerPage: roles.length,
    Resources: roles.map(role => ({
      schemas: [SCHEMA_OKTA_ROLE],
      id: role.id.toString(),
      displayName: role.name
    }))
  };


  return res.json(listResponse);
});

resourceTypesRoute.route('/')
.get((req, res) => {
  const resourceTypes: IResourceType[] = [{
    schemas: [SCHEMA_RESOURCE_TYPE],
    id: 'Role',
    name: 'Role',
    endpoint: '/Roles',
    description: 'Roles you can set on users of Todo App',
    schema: SCHEMA_OKTA_ROLE,
    meta: {
      resourceType: 'ResourceType'
    }
  },
  {
    schemas: [SCHEMA_RESOURCE_TYPE],
    id: 'Scope',
    name: 'Scope',
    endpoint: '/Scopes',
    description: 'This resource type is user scopes',
    schema: 'urn:okta:scim:schemas:core:1.0:Entitlement',
    schemaExtensions: [
      {
        schema: SCHEMA_SCOPE,
        required: true
      }
    ],
    meta: {
      resourceType: 'ResourceType'
    }
  }
];

  const resourceTypesListResponse: IListResponse<IResourceType> = {
    schemas: [SCHEMA_LIST_RESPONSE],
    totalResults: resourceTypes.length,
    startIndex: 1,
    itemsPerPage: resourceTypes.length,
    Resources: resourceTypes
  };

  return res.json(resourceTypesListResponse);
});

schemasRoute.route('/')
  .get((_, res) => {
    const scope: ISchema = {
      id: SCHEMA_SCOPE,
      name: 'Scope',
      description: 'User scopes for entitlements',
      attributes: [{
        name: 'scopes',
        description: 'Scope entitlement extension',
        type: 'string',
        multiValued: true,
        required: false,
        mutability: 'readWrite',
        returned: 'default',
        caseExact: false,
        uniqueness: 'none'
      }],
      meta: {
        resourceType: 'Schema',
        location: `/v2/Schemas/${SCHEMA_SCOPE}`
      }
    };

    const schemas = {
      schemas: [SCHEMA_LIST_RESPONSE],
      totalResults: 1,
      startIndex: 1,
      itemsPerPage: 1,
      Resources: [
        scope
      ]
    };

    return res.json(schemas);
  });

  scopesRoute.route('/')
  .get((_, res) => {
    const scopes = [{
      schemas: [SCHEMA_SCOPE],
      type: 'Scope',
      id: 'todos.delete',
      displayName: 'Delete task'
    }, {
      schemas: [SCHEMA_SCOPE],
      type: 'Scope',
      id: 'todos.update',
      displayName: 'Edit task'
    },{
      schemas: [SCHEMA_SCOPE],
      type: 'Scope',
      id: 'users.create',
      displayName: 'Add user'
    },{
      schemas: [SCHEMA_SCOPE],
      type: 'Scope',
      id: 'users.update',
      displayName: 'Update user'
    },{
      schemas: [SCHEMA_SCOPE],
      type: 'Scope',
      id: 'user.delete',
      displayName: 'Delete user'
    }, {
      schemas: [SCHEMA_SCOPE],
      type: 'Scope',
      id: 'users.read',
      displayName: 'Read user'
    }];

    const scopesListResponse: IListResponse<IScope> = {
      schemas: [
        SCHEMA_OKTA_ENTITLEMENT,
        SCHEMA_SCOPE
      ],
      totalResults: 1,
      startIndex: 1,
      itemsPerPage: 1,
      Resources: scopes
    };

    return res.json(scopesListResponse);
  });
