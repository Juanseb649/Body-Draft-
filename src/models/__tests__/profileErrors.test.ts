import { friendlyProfileError, NAME_MAX_LENGTH, PROFILE_SETUP_MISSING, validateDisplayName } from '../profileErrors';

describe('friendlyProfileError', () => {
  it('"Bucket not found" se explica: falta activar las fotos en el servidor', () => {
    expect(friendlyProfileError(new Error('Bucket not found'))).toBe(PROFILE_SETUP_MISSING);
  });

  it('la columna avatar_url que aun no existe, igual', () => {
    expect(
      friendlyProfileError({
        code: 'PGRST204',
        message: "Could not find the 'avatar_url' column of 'profiles' in the schema cache",
      }),
    ).toBe(PROFILE_SETUP_MISSING);
  });

  it('un error de RLS no se muestra en crudo', () => {
    expect(friendlyProfileError({ code: '42501', message: 'new row violates row-level security policy' })).toMatch(
      /permiso/,
    );
  });

  it('el limite de peso de la foto se muestra tal cual (ya esta en español)', () => {
    const msg = 'La imagen pesa 9 MB; el máximo son 5 MB.';
    expect(friendlyProfileError(new Error(msg))).toBe(msg);
  });
});

describe('validateDisplayName', () => {
  it('recorta y junta espacios', () => {
    expect(validateDisplayName('  Sebastián    Ibarra ')).toEqual({ ok: true, name: 'Sebastián Ibarra' });
  });

  it('rechaza vacio y demasiado largo', () => {
    expect(validateDisplayName('   ').ok).toBe(false);
    expect(validateDisplayName('a'.repeat(NAME_MAX_LENGTH + 1)).ok).toBe(false);
  });
});
