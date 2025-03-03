interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
}

interface GeocodingResponse {
  lat: number;
  lon: number;
}

const NOMINATIM_DELAY = 1000; // 1 second delay between requests
let lastRequestTime = 0;

export async function searchCep(cep: string): Promise<ViaCepResponse> {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) {
    throw new Error('CEP deve conter 8 dígitos');
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (!response.ok) {
      throw new Error('Erro ao consultar CEP');
    }

  const data = await response.json();

  if (data.erro) {
    throw new Error('CEP não encontrado');
  }

  return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro ao consultar CEP');
  }
}

export async function geocodeAddress(address: string): Promise<GeocodingResponse> {
  const encodedAddress = encodeURIComponent(address);
  
  // Respect Nominatim's usage policy with rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < NOMINATIM_DELAY) {
    await new Promise(resolve => setTimeout(resolve, NOMINATIM_DELAY - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
      {
        headers: {
          'User-Agent': 'ISP-Manager/1.0 (https://isp-manager.com)'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ao buscar coordenadas: ${response.status}`);
    }
  
    const data = await response.json();
  
    if (!data || data.length === 0) {
      throw new Error('Não foi possível encontrar as coordenadas para este endereço');
    }
  
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon)
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error('Erro ao buscar coordenadas. Por favor, tente novamente em alguns instantes.');
  }
}