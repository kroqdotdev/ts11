# Running teamsheet11.com

The production setup: one web server running Docker, with Caddy in front on the external
`web` network. The app lives in `/srv/apps/teamsheet-11` on that box, next to its
`.env.production` (see `.env.example`; never in git, never in the image).

| File                    | What it does                                                                |
| ----------------------- | --------------------------------------------------------------------------- |
| `../compose.yml`        | The app container (`teamsheet-11`) and the Litestream backup sidecar        |
| `litestream.yml`        | Streams every database change to the S3 bucket, with 72 hours of history    |
| `teamsheet11.com.caddy` | The Caddy site: TLS, the client address in `X-Real-IP`, an 8 MB request cap |

## Deploying

Every push to `main` runs `.github/workflows/deploy.yml` on the self-hosted runner: it builds
the image there, ships it with `docker load` and restarts the app. To roll back, run the
workflow by hand with an older commit. The server never builds anything itself.

After a deploy, `curl -fsS https://teamsheet11.com/api/auth/ok` (the same check the
container's health status in `docker ps` uses) shows it's up.

## Restoring the database

Litestream keeps the database in the bucket and can rebuild it as of any moment in the last
72 hours. Restoring replaces every account change since that moment, so only do it after
losing the database (a dead disk, a bad migration), not to undo one person's mistake.

On the server, in `/srv/apps/teamsheet-11`:

```sh
# 1. Stop the app and the backup (so nothing writes while you swap files).
docker compose stop web litestream

# 2. Rebuild the database from the bucket into a new file. For a moment in the past,
#    add: -timestamp 2026-11-14T10:00:00Z
docker compose run --rm -T litestream restore -config /etc/litestream.yml \
  -o /data/restored.db /data/teamsheet11.db

# 3. Keep the old files aside and put the restored one in place, owned by the app user.
mkdir -p data/broken && mv data/teamsheet11.db* data/broken/
mv data/restored.db data/teamsheet11.db
sudo chown 1000:1000 data/teamsheet11.db   # or: docker run --rm --user 0 -v "$PWD/data:/d" \
                                           #   --entrypoint chown teamsheet-11:latest 1000:1000 /d/teamsheet11.db

# 4. Start again, then check the site and the health status.
docker compose up -d
```

Uploaded images live in the same bucket under `u/` and aren't touched by a restore. An image
uploaded after the restore point has no database row afterwards, so it isn't served; it
only takes space until it's removed by hand.

A test restore (step 2 alone, into a scratch file) is safe to run any time; delete the
file afterwards.
