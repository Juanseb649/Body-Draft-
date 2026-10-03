# Maniquies 3D

Los `.glb` de esta carpeta son los modelos que muestra el modo
"Maniquí" de la sección **Crea**. Se entregan como asset de Metro, no
dentro del bundle JS (ver `metro.config.js` y
`src/services/bodyModelService.ts`).

| Archivo | Origen | Triángulos |
| --- | --- | --- |
| `mannequin-masculine.glb` | `FinalBaseMesh.obj` (base mesh de terceros) | 48.918 |
| `mannequin-feminine.glb` | `Female_Body_Base_Model.obj` (base mesh de terceros) | 47.616 |

Los dos se importaron con el mismo comando:

```bash
node tools/import-obj-model.mjs <ruta>.obj assets/models/mannequin-<silueta>.glb --no-uv
```

Hubo una tercera silueta, `neutral`, y los maniquíes se generaban por
código con un script (`tools/build-mannequin.mjs`) que lofteaba
secciones elípticas. Ambas cosas desaparecieron al llegar los base
meshes reales: el script ya no producía nada que se usara, y dejarlo
era un riesgo — correrlo sobrescribía los modelos buenos. Sigue en el
historial de git si alguna vez hace falta la técnica.

## Convención

Todo modelo que entre aquí tiene que quedar con:

- 1,80 m de alto
- los pies en `y = 0`
- centrado en `x` y en `z`
- mirando hacia **+Z** (es la dirección desde la que `<model-viewer>`
  encuadra por defecto)

`import-obj-model.mjs` aplica esas cuatro cosas solo; si un modelo
viene mirando al revés se le pasa `--flip-z`. El `.obj` puede traer
dentro objetos que no son el cuerpo (el femenino incluía el plano de
fondo del render): el importador se queda con el que más caras tenga, o
con el que se le indique con `--object=<nombre>`.

Hay tests que comprueban todo esto en
`src/__tests__/mannequinModels.test.ts`: altura, origen, proporciones,
orientación de las caras y coherencia del bobinado. Si importas un
modelo nuevo, córrelos.

## Si sale "Unable to resolve module ...mannequin-X.glb"

`glb` **no** es una extensión de asset por defecto de Metro: la añade
`metro.config.js` (`config.resolver.assetExts.push('glb')`). Metro
cachea su configuración, así que un servidor que se arrancó antes de
que ese archivo existiera sigue tratando el `.glb` como código fuente y
lista candidatos `.glb.ts`, `.glb.tsx`... que no existen.

Se arregla arrancando una vez con la caché limpia:

```bash
npx expo start --clear
```

Lo mismo aplica a cualquier cambio futuro de `metro.config.js`.

## Licencias

> **Pendiente.** Los dos `.glb` derivan de base meshes descargados de
> internet. Antes de publicar la app hay que dejar anotados aquí su
> autor, su origen y su licencia, y comprobar que permiten uso
> comercial y si exigen atribución dentro del producto.
