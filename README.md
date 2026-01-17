## Live

- Site: https://weneedwax.com

## Structure

- `src/` - Angular frontend
- `server/` - Express backend
- `ops/` - deployment and server configs

## Tech

- Angular
- Express
- Node.js
- PM2
- Cloudflare
- Let's Encrypt (Certbot)
- AWS EC2

## Notes

- Frontend build output goes to `dist/weneedwax`.
- Backend serves the built frontend and handles `/upload`.
- Backend config lives in `.env` (see `.env.example`).
- Nginx should allow uploads via `client_max_body_size` (see `ops/nginx.conf`).
