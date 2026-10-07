# ⚙️ Backend & Indexador on-chain para Usain Bot

## Propósito
Este módulo tiene como objetivo conectar la blockchain en tiempo real con el frontend de la web y con el bot de Telegram.

## Responsabilidades
1. **Indexador:**
   - Escucha los bloques y eventos de compra/venta del contrato del token o de la curva de vinculación.
   - Consulta el oráculo de precio de SOL para calcular el valor neto en USD (`compras_usd - ventas_usd`).
   - Mantiene la tabla ordenada de los 50 dorsales activos.
   - Detecta la graduación (`PoolGraduated`) y congela los dorsales.
   - En el bloque `graduación + 3000`, calcula el ganador mediante `blockhash mod 50 + 1`.

2. **API REST / WebSocket:**
   - Endpoint: `GET /state` (devuelve el objeto `RaceState` que consume `src/hooks/useRaceState.ts` en el frontend).
   - Estructura JSON:
     ```json
     {
       "count": 28,
       "bibs": [
         { "bib": 1, "wallet": "0x...", "netUsd": 350.5, "block": 1023400 }
       ],
       "graduated": false,
       "drawBlock": null,
       "drawHash": null,
       "winner": null,
       "ethPriceUsd": 3200,
       "updatedAt": "2026-09-18T21:00:00Z"
     }
     ```
