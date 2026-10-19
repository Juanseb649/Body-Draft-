import { isOverTrash, TRASH_CENTER_FROM_BOTTOM } from '../trashZone';

const W = 390;
const H = 600;
const trashY = H / 2 - TRASH_CENTER_FROM_BOTTOM;

describe('isOverTrash', () => {
  it('el centro del escenario no es el basurero', () => {
    expect(isOverTrash(0, 0, W, H)).toBe(false);
  });

  it('abajo al centro si lo es, aunque no se acierte al pixel', () => {
    expect(isOverTrash(0, trashY, W, H)).toBe(true);
    expect(isOverTrash(30, trashY - 30, W, H)).toBe(true);
  });

  it('abajo pero a un costado no', () => {
    expect(isOverTrash(150, trashY, W, H)).toBe(false);
  });

  it('sin medir el escenario nunca borra', () => {
    expect(isOverTrash(0, 0, 0, 0)).toBe(false);
  });
});
