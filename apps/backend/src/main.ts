import express from 'express';
import { Org, Prisma, PrismaClient, Todo, User } from '@prisma/client';
import passport from 'passport';
import session from 'express-session';
import passportBearer from 'passport-http-bearer';


import bodyParser from 'body-parser';
import morganBody from 'morgan-body';

// Import the scimRoute from the scim.ts file
import { scimRoute } from './scim';
import { todoRoutes } from './todo';
import { openIdRoutes } from './openid';
import { IUser } from './types';



const prisma = new PrismaClient();
const BearerStrategy = passportBearer.Strategy;

const app = express();
app.use(express.json())
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: 'top secret',
  cookie: {
    http: false,
    sameSite: 'lax'
  }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/api/todos', (req, res, next) => {
  if (req.isUnauthenticated()) {
    return res.sendStatus(401);
  }

  next();
});
app.use('/api/users', (req, res, next) => {
  if (req.isUnauthenticated()) {
    return res.sendStatus(401);
  }

  next();
});

passport.serializeUser( async (user: IUser, done) => {
  done(null, user.id);
});

passport.deserializeUser( async (id: number, done) => {
  const user = await prisma.user.findUnique({
    where: {
     id
    }
  });

  done(null, user);
});

app.post('/api/signout', async (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err)};
    res.sendStatus(204);
  });
});

app.get('/api/users/me', async (req, res) => {
  if (req.isUnauthenticated()) {
    return res.sendStatus(401);
  }

  let user: User;
  try {
    user = await prisma.user.findUniqueOrThrow({
      where: {
        id: req.user['id']
      }
    });
  } catch(e) {
    return res.status(500);
  }

  const {password, ...profile} = user;

  return res.json(profile);
});

app.use('/api/', todoRoutes);
app.use('', openIdRoutes);


///////////////////////////////////////////////////////
// SCIM-related routes

passport.use(new BearerStrategy(
  async (apikey, done) => {
    let org;
    try {
      org = await prisma.org.findFirstOrThrow({
        where: {
          apikey
        }
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        return done(null, false);
      }

      return done('Error');
    }

    return done(null, org, org.id.toString());
  }
));

app.use(bodyParser.json({ type: 'application/scim+json' }));
morganBody(app)
app.use('/scim/v2', passport.authenticate('bearer'), scimRoute);

const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on('error', console.error);
