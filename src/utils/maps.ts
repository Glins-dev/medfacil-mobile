import { Alert, Linking } from "react-native";

export type GoogleMapsTravelMode =
  | "driving"
  | "walking"
  | "bicycling"
  | "transit";

export interface BuildGoogleMapsRouteUrlParams {
  originAddress?: string | null;
  destinationAddress?: string | null;
  destinationName?: string | null;
  travelMode?: GoogleMapsTravelMode;
}

// Combina nome da unidade e endereco para melhorar a precisao no Google Maps sem duplicar termos.
export function formatRouteDestination(
  destinationName?: string | null,
  destinationAddress?: string | null
): string {
  const cleanName = destinationName?.trim() ?? "";
  const cleanAddress = destinationAddress?.trim() ?? "";

  if (cleanName && cleanAddress) {
    if (cleanAddress.toLowerCase().includes(cleanName.toLowerCase())) {
      return cleanAddress;
    }
    return `${cleanName}, ${cleanAddress}`;
  }

  return cleanAddress || cleanName;
}

// Monta a URL oficial de direcoes do Google Maps omitindo origem vazia para usar o GPS atual.
export function buildGoogleMapsRouteUrl({
  originAddress,
  destinationAddress,
  destinationName,
  travelMode = "driving",
}: BuildGoogleMapsRouteUrlParams): string | null {
  const destination = formatRouteDestination(
    destinationName,
    destinationAddress
  );
  if (!destination) {
    return null;
  }

  const queryParts: string[] = ["api=1"];
  const cleanOrigin = originAddress?.trim() ?? "";
  if (cleanOrigin) {
    queryParts.push(`origin=${encodeURIComponent(cleanOrigin)}`);
  }

  queryParts.push(`destination=${encodeURIComponent(destination)}`);
  queryParts.push(`travelmode=${encodeURIComponent(travelMode)}`);

  return `https://www.google.com/maps/dir/?${queryParts.join("&")}`;
}

// Abre a melhor rota no Google Maps entre o endereco do paciente e a unidade de atendimento.
export async function openBestRoute(
  params: BuildGoogleMapsRouteUrlParams
): Promise<boolean> {
  const url = buildGoogleMapsRouteUrl(params);
  if (!url) {
    Alert.alert(
      "Endereço indisponível",
      "Não foi possível identificar o endereço da clínica ou hospital para traçar a rota."
    );
    return false;
  }

  try {
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert(
      "Não foi possível abrir o mapa",
      "Verifique se o Google Maps ou um navegador está disponível no aparelho e tente novamente."
    );
    return false;
  }
}
