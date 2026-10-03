import { AI_PROVIDERS, createAiService, selectAiProvider } from '../aiProvider';

jest.mock('../geminiAiService', () => ({ GeminiAIService: class Gemini {} }));
jest.mock('../openAiService', () => ({ OpenAiService: class OpenAi {} }));

describe('selectAiProvider', () => {
  it('usa el proveedor que se le pida', () => {
    expect(selectAiProvider({ provider: 'gemini', geminiKey: 'g', openAiKey: 'o' })).toBe('gemini');
    expect(selectAiProvider({ provider: 'openai', geminiKey: 'g', openAiKey: 'o' })).toBe('openai');
  });

  it('acepta el nombre con mayúsculas o espacios', () => {
    // Viene de un .env escrito a mano: no conviene ser quisquilloso.
    expect(selectAiProvider({ provider: '  OpenAI ', openAiKey: 'o' })).toBe('openai');
  });

  it('si no se pide ninguno, usa el primero que tenga clave', () => {
    expect(selectAiProvider({ geminiKey: 'g' })).toBe('gemini');
    expect(selectAiProvider({ openAiKey: 'o' })).toBe('openai');
    // Con las dos, manda el orden de AI_PROVIDERS.
    expect(selectAiProvider({ geminiKey: 'g', openAiKey: 'o' })).toBe(AI_PROVIDERS[0]);
  });

  it('no cuenta una clave en blanco como configurada', () => {
    // Una variable declarada y vacia en el .env es el caso tipico, y
    // tomarla por buena acaba en un 401 mucho mas tarde.
    expect(selectAiProvider({ openAiKey: '   ' })).toBeNull();
  });

  it('avisa si el proveedor pedido no existe', () => {
    expect(() => selectAiProvider({ provider: 'claude', openAiKey: 'o' })).toThrow(/no existe/);
  });

  it('avisa si se pide un proveedor sin su clave', () => {
    expect(() => selectAiProvider({ provider: 'openai', geminiKey: 'g' })).toThrow(/EXPO_PUBLIC_OPENAI_API_KEY/);
  });

  it('devuelve null cuando no hay ninguna clave', () => {
    expect(selectAiProvider({})).toBeNull();
  });
});

describe('createAiService', () => {
  it('construye el servicio del proveedor elegido', () => {
    expect(createAiService({ provider: 'openai', openAiKey: 'o' }).constructor.name).toBe('OpenAi');
    expect(createAiService({ provider: 'gemini', geminiKey: 'g' }).constructor.name).toBe('Gemini');
  });

  it('sin claves no revienta al arrancar, falla al usarse', async () => {
    // La app tiene que poder abrirse sin IA configurada: lo que no
    // puede es fallar con un error incomprensible al primer uso.
    const service = createAiService({});
    await expect(service.removeBackground('file:///x.png')).rejects.toThrow(/No hay ninguna IA configurada/);
    await expect(service.generateFromDescription('una serpiente')).rejects.toThrow(
      /EXPO_PUBLIC_OPENAI_API_KEY o EXPO_PUBLIC_GEMINI_API_KEY/
    );
  });
});
