# Maniquies 3D

Los `.glb` de esta carpeta son los modelos que muestra la pantalla
"Explora". Se entregan como asset de Metro, no dentro del bundle JS
(ver `metro.config.js` y `src/services/bodyModelService.ts`).

| Archivo | Origen | Como se regenera |
| --- | --- | --- |
| `mannequin-neutral.glb` | Generado por codigo | `node tools/build-mannequin.mjs` |
| `mannequin-masculine.glb` | Generado por codigo | `node tools/build-mannequin.mjs` |
| `mannequin-feminine.glb` | `Female_Body_Base_Model.obj` (base mesh de terceros) | `node tools/import-obj-model.mjs <ruta>.obj assets/models/mannequin-feminine.glb --object=Female_Body_Base_Model --no-uv` |

`build-mannequin.mjs` NO genera `feminine`: esta excluido a proposito
de su lista de siluetas para no sobrescribir el modelo importado.

## Convencion

Todo modelo que entre aqui tiene que quedar con:

- 1,80 m de alto
- los pies en `y = 0`
- centrado en `x` y en `z`
- mirando hacia **+Z** (es la direccion desde la que
  `<model-viewer>` encuadra por defecto)

`import-obj-model.mjs` aplica esas cuatro cosas solo; si un modelo
viene mirando al reves se le pasa `--flip-z`.

## Licencias

> **Pendiente.** `mannequin-feminine.glb` deriva de un base mesh
> descargado de internet. Antes de publicar la app hay que dejar
> anotados aqui su autor, su origen y su licencia, y comprobar que
> permite uso comercial y si exige atribucion dentro del producto.
> Los otros dos son propios y no tienen esa restriccion.
