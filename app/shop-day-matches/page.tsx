import MatchesClient from "./MatchesClient";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "Shop Day Matches | Inner G Complete Agency",
  description: "Securely retrieve your matched barbershops and request a Shop Day.",
};

export default function ShopDayMatchesPage() {
  return (
    <main className="min-h-screen light bg-slate-50 text-slate-900 selection:bg-blue-500/20 relative overflow-hidden flex flex-col">
      <Navbar />
      
      {/* Decorative background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100 blur-[120px] opacity-60 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100 blur-[120px] opacity-60 pointer-events-none" />
      
      <div className="relative z-10 container mx-auto px-4 py-32 max-w-5xl flex-grow flex flex-col justify-center">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Shop Day <span className="text-blue-600">Matches</span>
          </h1>
          <p className="text-slate-600 font-medium text-lg max-w-2xl mx-auto">
            Find the perfect shop for your next career move. Enter your phone number below to securely access the shops we've matched you with based on your location and goals.
          </p>
        </div>

        <MatchesClient />
      </div>

      <Footer />
    </main>
  );
}
