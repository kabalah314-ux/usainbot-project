# Plan de información y alertas del bot de Telegram

## Objetivo

Conectar el bot a datos públicos y verificables de Usain Bot para que la comunidad reciba información útil sin depender de mensajes manuales constantes.

La conexión solo se activará cuando exista un contrato oficial, el par o curva esté confirmado y los enlaces hayan sido revisados.

## Arquitectura gratuita

```text
Solana RPC público
        ↓
Indexador Python local
        ↓
Base SQLite o JSON local
        ↓
Telegram Bot API
        ↓
Grupo oficial de Usain Bot
```

### Límites

- Telegram Bot API: sin coste.
- Python y SQLite: sin coste.
- RPC público: sin coste, sujeto a límites de velocidad y disponibilidad.
- Ejecución: gratuita mientras el ordenador esté encendido y conectado.
- No se contratará un indexador, servidor, API de precios o servicio premium sin autorización expresa.

## Información fija del bot

El bot podrá responder a:

- Estado del proyecto: prelaunch, live, mantenimiento o pausado.
- Web oficial y redes verificadas.
- Contract Address y explorador, solo después de validarlos.
- Red, clúster y moneda de gas.
- Suministro, taxes y datos del contrato, indicando si están verificados.
- Dónde consultar el gráfico y cómo comprobar una transacción.
- Guía de conexión a Solana.
- Preguntas frecuentes y avisos de seguridad.
- Reglas de la comunidad y contacto con administradores.

## Eventos que podrá detectar

### 1. Lanzamiento

Mensaje cuando el administrador active el modo live después de verificar:

- Contract Address.
- Contrato y red correctos.
- Par o curva oficial.
- Enlaces de compra y explorador.

No se activará solo por encontrar una dirección parecida en la cadena.

### 2. Compras y ventas

Formato previsto:

```text
🏃⚡ TRADE DETECTED

Type: Buy
Amount: [TOKEN_AMOUNT] $BOLT
Value: [NATIVE_AMOUNT] SOL
Wallet: 8xJ4...mK9
Slot: [SLOT]
Transaction: [TX_LINK]

Verify every detail before taking action.
```

Reglas:

- Mostrar wallet abreviada, nunca datos personales inferidos.
- Enlazar siempre la transacción.
- El valor en USD será opcional y deberá marcarse como estimación.
- No usar lenguaje como “compra garantizada”, “última oportunidad” o “seguro que sube”.
- Añadir deduplicación para no repetir el mismo evento.

### 3. Hitos verificables

Se pueden configurar avisos para:

- Número de holders.
- Volumen acumulado o de 24 horas, si la fuente es fiable.
- Número de transacciones.
- Graduación de la curva.
- Creación o migración de liquidez.
- Liquidez bloqueada o quemada, solo tras verificar la transacción correspondiente.

Cada hito debe incluir fuente, bloque o transacción cuando exista.

### 4. Incidencias y mantenimiento

El bot debe avisar si:

- El RPC deja de responder.
- El indexador pierde slots.
- Hay datos duplicados o inconsistentes.
- El contrato o enlace configurado no coincide con el registro oficial.
- El administrador pausa las alertas.

En caso de duda, el bot debe decir que está verificando los datos y no inventar una alerta.

## Mensajes que no utilizaremos

- Sorteos por bloque, Bibs o premios automáticos.
- Promesas de rentabilidad o crecimiento.
- “Rug-proof” o garantías absolutas sin pruebas actualizadas.
- FOMO engañoso o presión para comprar.
- Identificación de una persona a partir de una wallet.
- Alertas basadas únicamente en una cuenta de X o un rumor.

## Controles del administrador

En una segunda fase se podrán añadir comandos restringidos a administradores:

- `/pausealerts` — pausar avisos.
- `/resumealerts` — reanudar avisos.
- `/statusindexer` — comprobar último slot leído.
- `/setthreshold` — cambiar el umbral de trades destacados.
- `/testalert` — probar formato sin afirmar que es una operación real.

Estos comandos nunca deben mostrar el token del bot ni permitir modificar la CA desde un mensaje normal.

## Datos necesarios para activarlo

1. Contract Address oficial.
2. Dirección del par o curva inicial.
3. Instrucciones y cuentas del programa del token.
4. RPC público confirmado para Solana.
5. Enlace del explorador.
6. Umbral opcional para trades destacados.
7. Grupo de Telegram donde publicar.

Hasta disponer de esos datos, el bot continuará funcionando solo como asistente de comunidad en modo prelaunch.
