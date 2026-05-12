# socrates-frontend

Frontend React de Socrates Pro. Bundle compilado se sirve desde el
backend FastAPI (repo socrates-pro-backend) en
/static/react/.

## Stack

- React 19
- Vite 8
- React Router DOM
- Axios
- Recharts (gráficos)

## Desarrollo local

```bash
npm install
npm run dev
```

Vite arranca en http://localhost:5173/ con proxy a backend en
http://localhost:8000/ (configurado en vite.config.js).

## Build de producción

```bash
npm run build
```

Genera bundle compilado en ./dist/.

## Deploy a producción

Build local + scp manual al servidor backend:

```bash
npm run build
scp -r dist/* socrates:/home/ubuntu/panamacompra/frontend/static/react/
```

El backend FastAPI sirve estos archivos en /static/react/ via
StaticFiles. No requiere restart del backend tras deploy del bundle
(es contenido estático).

## Workflow

1. Editar .jsx localmente.
2. `npm run dev` para probar en http://localhost:5173/.
3. Commit + push a GitHub (origin/master).
4. `npm run build` para generar bundle.
5. scp del bundle al servidor.
6. Recargar el navegador del cliente.

## Backup automático del bundle anterior

(Opcional, pero recomendado) Antes del scp, hacer backup en servidor:

```bash
ssh socrates 'cd /home/ubuntu/panamacompra/frontend/static/ &&
cp -r react react.bak.$(date +%Y%m%d_%H%M%S)'
```

## Histórico relevante

- **12-may-2026**: workflow migrado a build local + scp manual
  (antes: build directo desde servidor con outDir absoluto al
  backend). Cambio en vite.config.js.
- **4-may-2026**: rediseño Track-premium desplegado (build hecho en
  servidor, código fuente sin commit hasta 12-may).
