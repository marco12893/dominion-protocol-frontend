import { UNIT_ASSET_SIZES } from "@/features/game/constants/assets";

export default function UnitPreviewImage({ unitId, assetPath, alt, className }) {
  const sizeInfo = UNIT_ASSET_SIZES[unitId];

  // Use a dedicated static preview image if available
  if (sizeInfo?.preview) {
    return <img src={sizeInfo.preview} alt={alt} className={className} />;
  }

  // If we have spritesheet info, use a div with background-image to crop to the first frame
  if (sizeInfo?.spritesheet) {
    const { rows, cols } = sizeInfo.spritesheet;
    return (
      <div
        className={className}
        style={{
          backgroundImage: `url(${assetPath})`,
          backgroundSize: `${cols * 100}% ${rows * 100}%`,
          backgroundPosition: "0% 0%",
          backgroundRepeat: "no-repeat",
        }}
        aria-label={alt}
      />
    );
  }

  return <img src={assetPath} alt={alt} className={className} />;
}
