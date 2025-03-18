# TodoApp SCIM Demo

This project demonstrates a B2B Todo app with added endpoints conforming to System for Cross-Domain Identity Management (SCIM) specs. This project is referenced in [Level the playing field with user lifecycle automation](https://scim.alisaduncan.dev/) talk.

The frontend is a React app, the backend uses ExpressJS, uses a SQLite file db and Prisma ORM all housed in a Nx workspace. This project is intentionally minimal and simplistic, and is for demonstration purposes only.

## Getting going

Clone the repo. You may want to fork it first so you can track changes in Git.

Install dependencies by running `npm ci`. Seed the db by running `npm run init-db`.

Start the project by running `npm start`. This starts the frontend app on port 3000 and proxies calls to the backend running on port 3333.

View the db by running `npx prisma studio`. Fill in the OAuth authorization server info to if you wish to log in.

-----

Author not responsible for production use or ongoing maintenance. Reach out to `dev-advocacy@okta.com`, [@alisaduncan.dev](https://bsky.app/profile/alisaduncan.dev) on Bluesky, or [@jalisaduncan](https://www.linkedin.com/in/jalisaduncan) on LinkedIn

## License

Apache 2.0, see [LICENSE](LICENSE).

