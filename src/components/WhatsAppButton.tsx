import { MessageCircle } from "lucide-react";
// Se você criou o arquivo lib/whatsapp.ts, use a função abaixo:
// import { openWhatsApp } from "@/lib/whatsapp";

const PHONE = "5596981032928";
const DEFAULT_MSG = "Olá! Quero um site Elevea. Pode me ajudar?";

const WhatsAppButton = () => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Usando o endpoint oficial (funciona em mobile e desktop):
    const url = `https://api.whatsapp.com/send?phone=${PHONE}&text=${encodeURIComponent(
      DEFAULT_MSG
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");

    // Se preferir usar a função centralizada:
    // openWhatsApp();
  };

  return (
    <button
      onClick={handleClick}
      className="whatsapp-mobile bg-green-600 hover:bg-green-700 text-white rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shadow-xl transition-transform hover:scale-110"
      aria-label="Fale conosco no WhatsApp"
    >
      <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7" />
    </button>
  );
};

export default WhatsAppButton;
