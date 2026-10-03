/**
 * Mocks de los modulos NATIVOS que se cargan de forma transitiva.
 *
 * Casi nada de la app importa estos modulos directamente, pero
 * `services/supabaseClient.ts` si usa AsyncStorage, y todo repositorio
 * lo arrastra. Sin estos mocks cualquier test que toque un repositorio
 * falla con "native module not found" aunque lo que se este probando
 * sea logica pura.
 */

// `createClient` revienta si la URL no es valida, y en los tests no se
// carga el .env. Se ponen valores de mentira a proposito: ningun test
// debe tocar el proyecto real de Supabase, asi que si alguno se dejara
// una llamada de verdad sin mockear, fallaria en vez de escribir datos.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://proyecto-de-prueba.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-de-prueba';
process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'gemini-key-de-prueba';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// La implementacion real llama a codigo nativo; los tests que usan
// estas APIs definen su propio comportamiento con mockResolvedValue.
jest.mock('expo-file-system', () => ({
  File: jest.fn(),
  Directory: jest.fn(),
  Paths: { cache: '/cache', document: '/document' },
}));

jest.mock('expo-asset', () => ({
  Asset: { fromModule: jest.fn() },
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000000'),
}));
