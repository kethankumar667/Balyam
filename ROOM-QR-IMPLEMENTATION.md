# Room QR Code Sharing & Scan-to-Join Implementation

## 1. Overview
The Room QR Code feature provides zero-friction mobile onboarding for in-person gatherings and friends playing together. It allows host players to display a clean, high-contrast QR code on desktop or mobile screens, allowing nearby players to point their camera and instantly jump into the game room.

---

## 2. Technical Architecture
1. **QR Generation**:
   - Built using `qrcode.react` (`QRCodeSVG`) with high error correction level (`H`), ensuring reliable scanning even under glare or screen dimming.
   - Encodes standard deep link: `${window.location.origin}/room/${code}`.

2. **Components**:
   - **`QrCodeModal.tsx`**: Presents large QR code, 6-character room code, direct copy link button, and direct copy code button.
   - **`RoomCodeShare.tsx`**: Integrated into room lobbies beside Copy and WhatsApp share options.
   - **`QrScannerModal.tsx`**: Optional in-app camera scanner for devices without native camera QR reading.

3. **Accessibility & Design Tokens**:
   - High contrast dark/light canvas with clear borders.
   - Focus trapped modal with keyboard Escape support.
   - Accessible button names with screen reader notifications on successful copy.
