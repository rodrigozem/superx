export const TOURNAMENT_IMAGE_WIDTH = 489;
export const TOURNAMENT_IMAGE_HEIGHT = 275;

/**
 * Converte o arquivo escolhido num data URL JPEG de 489x275 (corte "cover",
 * centralizado). Mantém o payload de sync pequeno e o card sempre no formato
 * certo.
 */
export async function fileToTournamentImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = TOURNAMENT_IMAGE_WIDTH;
  canvas.height = TOURNAMENT_IMAGE_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");

  const scale = Math.max(
    TOURNAMENT_IMAGE_WIDTH / bitmap.width,
    TOURNAMENT_IMAGE_HEIGHT / bitmap.height,
  );
  const drawWidth = bitmap.width * scale;
  const drawHeight = bitmap.height * scale;
  const offsetX = (TOURNAMENT_IMAGE_WIDTH - drawWidth) / 2;
  const offsetY = (TOURNAMENT_IMAGE_HEIGHT - drawHeight) / 2;

  ctx.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", 0.85);
}
