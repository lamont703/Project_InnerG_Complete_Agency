import RequestsClient from "./RequestsClient";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "Shop Day Requests | Inner G Complete Agency",
  description: "Securely view and manage Shop Day requests from local barbers.",
};

export default function ShopDayRequestsPage() {
  return (
    <main className="min-h-screen light bg-slate-50 text-slate-900 selection:bg-blue-500/20 relative overflow-hidden flex flex-col">
      <Navbar />
      
      {/* Decorative background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100 blur-[120px] opacity-60 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100 blur-[120px] opacity-60 pointer-events-none" />
      
      <div className="relative z-10 container mx-auto px-4 py-32 max-w-5xl flex-grow flex flex-col justify-center">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Shop Day <span className="text-blue-600">Requests</span>
          </h1>
          <p className="text-slate-600 font-medium text-lg max-w-2xl mx-auto">
            Manage your barbershop's talent pipeline. Enter your shop's phone number below to securely review barbers who have requested a Shop Day with you.
          </p>
        </div>

        <RequestsClient />
      </div>

      <Footer />
    </main>
  );
}
