import { Router } from 'express';
import { PrismaClient, Org } from '@prisma/client';
import OpenIDConnectStrategy from 'passport-openidconnect';
import passport from 'passport';

const prisma = new PrismaClient();
export const openIdRoutes = Router();

async function orgFromId(id: string) {
  const org = await prisma.org.findFirst({
    where: {
      id: parseInt(id)
    }
  })
  return org;
}

function createStrategy(org: Org): OpenIDConnectStrategy {
  return new OpenIDConnectStrategy({
    issuer: org.issuer,
    authorizationURL: org.authorization_endpoint,
    tokenURL: org.token_endpoint,
    userInfoURL: org.userinfo_endpoint,
    clientID: org.client_id,
    clientSecret: org.client_secret,
    scope: 'profile email',
    callbackURL: `http://localhost:3333/openid/callback/${org.id}`
  },
    async (_, profile, cb) => {

      // Passport.js runs this verify function after successfully completing
      // the OIDC flow, and gives this app a chance to do something with
      // the response from the OIDC server, like create users on the fly.

      // unfortunately can't do this all in one shot as upsert due to non-unique where clause
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { externalId: profile.id },
            { email: profile.emails[0].value }
          ],
          AND: { orgId: org.id }
        }
      });

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { externalId: profile.id }
        });
      } else {
        user = await prisma.user.create({
          data: {
            org: { connect: { id: org.id } },
            externalId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
          }
        })
      }

      return cb(null, user);
    })
}

openIdRoutes.post('/api/openid/check', async (req, res, next) => {
  const { username } = req.body;

  const splits = username.split('@');
  if (splits.length !== 1 && !splits[1]) {
    return res.send(400);
  }

  const domain = splits[1];
  const org = await prisma.org.findFirst({
    where: {
      OR: [
        { domain },
        {
          User: {
            some: { email: username }
          }
        }
      ]
    }
  });

  let responseBody: { org_id: null | number } = { org_id: null };
  if (org && org.issuer) {
    responseBody = { org_id: org.id };
  }

  return res.json(responseBody);
});

// The frontend then redirects here to have the backend start the OIDC flow.
// (You should probably use random IDs, not auto-increment integers
// to avoid revealing how many enterprise customers you have.)
openIdRoutes.get('/openid/start/:id', async (req, res, next) => {

  const org = await orgFromId(req.params.id);
  if (!org) {
    return res.sendStatus(404);
  }

  const strategy = createStrategy(org);
  if (!strategy) {
    return res.sendStatus(404);
  }

  return passport.authenticate(strategy)(req, res, next);
});

openIdRoutes.get('/openid/callback/:id', async (req, res, next) => {
  const org = await orgFromId(req.params.id);
  if (!org) {
    return res.sendStatus(404);
  }

  const strategy = createStrategy(org);
  if (!strategy) {
    return res.sendStatus(404);
  }

  return passport.authenticate(strategy, {
    successRedirect: 'http://localhost:3000/',
    failureRedirect: 'http://localhost:3000/error'
  })(req, res, next);
});
