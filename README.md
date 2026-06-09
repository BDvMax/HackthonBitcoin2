# Kukul Vault

**Kukul Vault** es una aplicación web avanzada para la simulación, creación y gestión de bóvedas Bitcoin multifirma (`multisig`) con esquemas de recuperación por inactividad basados en contratos de tiempo (`timelocks` BIP65/BIP68).

Este proyecto combina la potencia técnica del lenguaje descriptor de Bitcoin (BIP380) con una interfaz de usuario premium, diseñada tanto para usuarios principiantes que buscan aprender sobre custodia inteligente, como para profesionales que necesitan generar kits de respaldo detallados.

---

## Video Demostrativo

[![Ver demostración de Kukul Vault](https://img.shields.io/badge/Ver-Demostración-red?style=for-the-badge&logo=youtube)](https://youtube.com/watch?v=TU_VIDEO)

**Video explicativo del proyecto:**
https://youtube.com/watch?v=TU_VIDEO

---

## Funcionamiento

El asistente interactivo de Kukul Vault te guía paso a paso para conformar tu bóveda:

1. **Definición de Parámetros:** Configura el número total de llaves participantes ($N$), las firmas requeridas para gastar ($M$) y la red objetivo (Signet, Testnet4 o Mainnet).
2. **Registro de Dispositivos:** Incorpora cada llave pública extendida (Xpub/Ypub/Zpub). Puedes simular dispositivos físicos como Ledger, Trezor, Coldcard o teléfonos móviles, asignando sus respectivas huellas digitales (`fingerprint`) y rutas de derivación estándar (ej. `m/48'/1'/0'/2'`).
3. **Seguro de Emergencia (Timelocks):** Configura cláusulas temporales basadas en bloques de Bitcoin. En caso de pérdida de llaves o inactividad prolongada, la bóveda puede degradar su política de firmas (ej. reducir el quórum requerido) o habilitar una llave de emergencia.
4. **Respaldo y Exportación:** Visualiza el descriptor criptográfico generado y descarga un **Kit de Respaldo PDF** interactivo y estructurado, vital para la recuperación futura.
5. **Panel Watch-Only:** Accede a la bóveda en tiempo real para monitorear balances confirmados/pendientes, consultar UTXOs y auditar historiales de transacciones, todo bajo una interfaz de terminal cypherpunk.

---

## Transparencia

Kukul Vault está diseñado bajo los principios fundamentales de Bitcoin: **"Don't trust, verify"**.

- **Software No Custodio:** Kukul Vault **jamás** solicita, almacena ni gestiona llaves privadas (`xprv`). Toda la arquitectura opera exclusivamente con llaves públicas (`xpub`), garantizando que la soberanía de los fondos se mantenga siempre en manos del usuario.
- **Estándares Abiertos (BIP380):** La bóveda se materializa a través de descriptores de Bitcoin estandarizados. Esto elimina la dependencia del software ("vendor lock-in"); puedes importar el descriptor generado (`wsh(sortedmulti(...))`) en cualquier wallet compatible del mercado como **Sparrow Wallet**, **Electrum** o **Liana**.
- **Código Abierto y Auditable:** La transparencia es total. Cualquier usuario puede inspeccionar la lógica de derivación y compilación de scripts.

---

## Tecnologías Integradas

El stack técnico de Kukul Vault fusiona las herramientas web modernas con la criptografía estándar de Bitcoin:

- **Frontend & UI:** 
  - **Next.js 16 (React 19)**: Renderizado de alto rendimiento en el cliente.
  - **Tailwind CSS**: Diseño UI/UX responsivo, con estéticas formales y animaciones fluidas (patrones de red, glassmorphism, temas oscuros puros).
- **Lógica Criptográfica Bitcoin:**
  - **`bitcoinjs-lib`**: Compilación de scripts P2WSH, transacciones multisig y evaluación de timelocks.
  - **`bip32` & `tiny-secp256k1`**: Operaciones de curva elíptica Secp256k1 y derivación determinista de direcciones.
- **Exportación & Herramientas:**
  - **`jspdf` & `jspdf-autotable`**: Generación de reportes de recuperación formales e interactivos.
  - **`react-qr-code`**: Codificación nativa de Xpubs y descriptores.
- **Sincronización Blockchain:** Conexión directa y asíncrona con las APIs REST de **Mempool.space** y **Blockstream Esplora** para obtención de datos on-chain (UTXOs, fee rates, transacciones).

---

## Ciberseguridad

La seguridad es el pilar central de Kukul Vault, mitigando riesgos sistémicos mediante un diseño defensivo:

1. **Ejecución 100% Client-Side:** Toda la lógica criptográfica, la derivación de llaves, la generación del descriptor y la exportación de PDFs ocurre **exclusivamente en el navegador de tu dispositivo**. Ningún dato sensible es transmitido a servidores backend.
2. **Compatibilidad Offline (Cold Storage):** Una vez cargada la aplicación, la configuración de la bóveda y la generación de descriptores pueden ejecutarse en entornos desconectados de internet ("air-gapped"), blindando el proceso contra ataques de red.
3. **Validación Estricta de Entradas:** Filtrado criptográfico de Xpubs insertados para evitar formatos maliciosos, rutas de derivación inválidas o fingerprints alterados.
4. **Protección contra Inactividad:** La integración de Timelocks (BIP65/BIP68) garantiza que los fondos no queden permanentemente inaccesibles ante escenarios catastróficos (pérdida simultánea de múltiples llaves hardware o fallecimiento), permitiendo recuperar los fondos tras el período de bloques configurado.

---

## Creadores

Este proyecto fue desarrollado para la Hackathon de Bitcoin por el equipo conformado por:

- Max
- Guillermo
- Emiliano
- Rafael
