import { describeError, ProxyAiService, type InvokeAi } from '../proxyAiService';
import { toDataUri } from '../imageDataUri';

jest.mock('../supabaseClient', () => ({ supabase: { functions: { invoke: jest.fn() } } }));
jest.mock('../imageDataUri', () => ({ toDataUri: jest.fn(async (uri: string) => `data:image/jpeg;base64,${uri.length}`) }));

const IMG = 'data:image/png;base64,QUJD';

function invokeReturning(result: { data: unknown; error: unknown }) {
  return jest.fn<ReturnType<InvokeAi>, Parameters<InvokeAi>>().mockResolvedValue(result);
}

describe('ProxyAiService', () => {
  it('compone pasando por la funcion: foto y boceto como data URI, y la zona', async () => {
    const invoke = invokeReturning({ data: { image: IMG, used: 1, limit: 10 }, error: null });
    const ai = new ProxyAiService(invoke);

    const out = await ai.composeOnPhoto({ photoUri: 'file:///foto.jpg', designUri: 'file:///boceto.png', bodyZoneLabel: 'Antebrazo' });

    expect(out).toBe(IMG);
    expect(toDataUri).toHaveBeenCalledWith('file:///foto.jpg');
    expect(invoke).toHaveBeenCalledWith({
      op: 'compose',
      photo: expect.stringMatching(/^data:image\//),
      design: expect.stringMatching(/^data:image\//),
      zone: 'Antebrazo',
    });
  });

  it('nunca manda una API key: solo la operacion y sus datos', async () => {
    const invoke = invokeReturning({ data: { image: IMG }, error: null });
    await new ProxyAiService(invoke).removeBackground('file:///b.png');
    const body = invoke.mock.calls[0][0];
    expect(Object.keys(body).sort()).toEqual(['image', 'op']);
    expect(JSON.stringify(body)).not.toMatch(/sk-|key/i);
  });

  it('generar un diseño devuelve un TattooDesign con la imagen', async () => {
    const invoke = invokeReturning({ data: { image: IMG }, error: null });
    const design = await new ProxyAiService(invoke).generateFromDescription('Koi', 'Japonés');
    expect(invoke).toHaveBeenCalledWith({ op: 'generate', prompt: 'Koi', style: 'Japonés' });
    expect(design).toMatchObject({ imageUrl: IMG, source: 'aiGenerated', style: 'Japonés' });
  });

  it('la cuota agotada llega con el mensaje de la funcion, en español', async () => {
    const context = new Response(
      JSON.stringify({ error: 'quota_exceeded', limit: 10, message: 'Usaste tus 10 usos de IA de hoy. Vuelve a intentarlo mañana.' }),
      { status: 429 },
    );
    const invoke = invokeReturning({ data: null, error: { name: 'FunctionsHttpError', context } });
    await expect(new ProxyAiService(invoke).removeBackground('file:///b.png')).rejects.toThrow(/10 usos de IA de hoy/);
  });
});

describe('describeError', () => {
  it('si la funcion no esta desplegada (404), lo dice', async () => {
    const msg = await describeError({ name: 'FunctionsHttpError', context: new Response('not found', { status: 404 }) });
    expect(msg).toMatch(/falta desplegar/);
  });

  it('sin conexion', async () => {
    expect(await describeError({ name: 'FunctionsFetchError', message: 'Failed to fetch' })).toMatch(/conexión/);
  });
});
