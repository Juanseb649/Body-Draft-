import {
  COMMENT_MAX_LENGTH,
  commentAuthorName,
  formatCount,
  relativeTime,
  toggleLike,
  UNKNOWN_AUTHOR,
  validateComment,
} from '../designSocial';

describe('validateComment', () => {
  it('recorta espacios y acepta un comentario normal', () => {
    expect(validateComment('  ¿Lo harías a color?  ')).toEqual({ ok: true, body: '¿Lo harías a color?' });
  });

  it('rechaza un comentario vacio o de solo espacios', () => {
    expect(validateComment('   \n ').ok).toBe(false);
  });

  it('rechaza por encima del limite de la base, pero acepta justo el limite', () => {
    expect(validateComment('a'.repeat(COMMENT_MAX_LENGTH)).ok).toBe(true);
    const tooLong = validateComment('a'.repeat(COMMENT_MAX_LENGTH + 1));
    expect(tooLong.ok).toBe(false);
    if (!tooLong.ok) expect(tooLong.error).toContain(String(COMMENT_MAX_LENGTH + 1));
  });
});

describe('toggleLike', () => {
  it('suma al dar me gusta y resta al quitarlo', () => {
    const liked = toggleLike({ likeCount: 4, commentCount: 1, likedByMe: false });
    expect(liked).toEqual({ likeCount: 5, commentCount: 1, likedByMe: true });
    expect(toggleLike(liked)).toEqual({ likeCount: 4, commentCount: 1, likedByMe: false });
  });

  it('nunca deja el contador en negativo', () => {
    expect(toggleLike({ likeCount: 0, commentCount: 0, likedByMe: true }).likeCount).toBe(0);
  });
});

describe('formatCount', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1 k'],
    [1280, '1,2 k'],
    [2_480_000, '2,4 M'],
  ])('%i → %s', (n, expected) => {
    expect(formatCount(n)).toBe(expected);
  });
});

describe('relativeTime', () => {
  const now = new Date('2026-10-18T12:00:00.000Z');

  it.each([
    ['2026-10-18T11:59:30.000Z', 'ahora'],
    ['2026-10-18T11:55:00.000Z', 'hace 5 min'],
    ['2026-10-18T09:00:00.000Z', 'hace 3 h'],
    ['2026-10-16T12:00:00.000Z', 'hace 2 d'],
  ])('%s → %s', (iso, expected) => {
    expect(relativeTime(iso, now)).toBe(expected);
  });

  it('un reloj adelantado no da tiempos negativos', () => {
    expect(relativeTime('2026-10-18T12:05:00.000Z', now)).toBe('ahora');
  });
});

describe('commentAuthorName', () => {
  const base = { id: 'c1', designId: 'd1', body: 'hola', createdAt: '2026-10-18T10:00:00Z' };

  it('mi comentario lleva mi nombre ACTUAL, aunque la base lo guardara vacio o con el viejo', () => {
    expect(commentAuthorName({ ...base, userId: 'u1', authorName: '' }, { id: 'u1', name: 'Sebas' })).toBe('Sebas');
    expect(commentAuthorName({ ...base, userId: 'u1', authorName: 'Nombre viejo' }, { id: 'u1', name: 'Sebas' })).toBe('Sebas');
  });

  it('el de otra persona lleva el que puso la base', () => {
    expect(commentAuthorName({ ...base, userId: 'u2', authorName: 'Lucía' }, { id: 'u1', name: 'Sebas' })).toBe('Lucía');
  });

  it('nunca "Alguien": sin nombre en ningun lado, un texto neutro', () => {
    expect(commentAuthorName({ ...base, userId: 'u2', authorName: '' }, { id: 'u1' })).toBe(UNKNOWN_AUTHOR);
    expect(UNKNOWN_AUTHOR).not.toMatch(/alguien/i);
  });
});
