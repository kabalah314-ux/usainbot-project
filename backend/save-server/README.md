# save-server — guardado en la nube (opción A)

Servidor de guardado de partida de USAINBOT: **cero dependencias**, solo Node 18+.
Autentica wallets de Solana por **firma Ed25519 de un mensaje** (sin transacción,
sin gastar SOL) y guarda una partida por clave pública.

## Endpoints

| Método | Ruta | Body | Respuesta |
| --- | --- | --- | --- |
| GET | `/health` | — | `{ok, saves}` |
| POST | `/auth/nonce` | `{pubkey}` | `{message, expiresAt}` |
| POST | `/auth/verify` | `{pubkey, message, signature}` (base64) | `{token, expiresAt}` |
| GET | `/save` | cabecera `Authorization: Bearer <token>` | `{seq, savedAt, data}` o `404` |
| POST | `/save` | `{savedAt, data}` | `{seq}` · `409 {save}` si la nube es más nueva |
| DELETE | `/save` | cabecera Bearer | `{ok}` |

Regla de conflictos: **gana el `savedAt` más alto**. Si el cliente sube algo más
antiguo que lo que ya hay, recibe `409` con el guardado actual para bajarlo.

## Local

```bash
node backend/save-server/index.mjs          # http://localhost:8787
node backend/save-server/test.mjs           # test del servidor (auth + push/pull)
node backend/save-server/test-client.mjs    # test del cliente real (src/lib/remoteSave.ts)
```

Con el servidor en marcha y `VITE_SAVE_API=http://localhost:8787` en `.env.local`,
el botón **CONECTAR WALLET** aparece en la pausa del juego.

Variables: `PORT` (8787), `HOST`, `DATA_DIR` (`./data`), `ALLOWED_ORIGINS`
(CSV de orígenes o `*`), `TOKEN_TTL_HOURS` (168).

## Despliegue

Cualquier sitio que ejecute un proceso Node con disco persistente:

- **Render / Railway / Fly.io**: comando `node backend/save-server/index.mjs`,
  añade un *volume* a `./data` para que los guardados sobrevivan a los deploys.
- **VPS**: systemd apuntando al mismo comando.

Después, en el frontend:

1. `.env.local` (o el panel de Vercel): `VITE_SAVE_API=https://tu-dominio`
2. `ALLOWED_ORIGINS=https://tu-web.vercel.app` en el servidor.
3. `npm run build` → el botón **CONECTAR WALLET** aparece en el menú de pausa.

Sin `VITE_SAVE_API` el juego funciona igual, solo que el guardado se queda en
`localStorage` del navegador.

## Seguridad

- El reto (`/auth/nonce`) caduca en 5 minutos y solo sirve para la misma pubkey.
- El token dura `TOKEN_TTL_HOURS` y se guarda en el cliente (`usainbot_session_v1`).
- Límite de 512 KB por guardado.
- No se guarda nada identificativo además de la clave pública.
