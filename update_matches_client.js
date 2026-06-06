const fs = require('fs');
let content = fs.readFileSync('app/shop-day-matches/MatchesClient.tsx', 'utf8');

const newImports = `import { Phone, Lock, Building, Users, MapPin, CheckCircle2, ChevronRight, Scissors, Star, Briefcase, Sparkles, ShieldCheck } from "lucide-react";`;
content = content.replace(/import { Phone, Lock, Building, Users, MapPin, CheckCircle2, ChevronRight, Scissors } from "lucide-react";/, newImports);

const maskFunctions = `
function maskPhone(phone: string | null) {
  if (!phone) return "No Phone Listed";
  const cleaned = phone.replace(/\\D/g, '');
  if (cleaned.length < 10) return "****";
  const last4 = cleaned.slice(-4);
  return \`(***) ***-\${last4}\`;
}

function maskEmail(email: string | null) {
  if (!email) return "No Email Listed";
  const parts = email.split("@");
  if (parts.length !== 2) return "****@****.com";
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.substring(0, Math.min(2, name.length)) + "****";
  return \`\${maskedName}@\${domain}\`;
}
`;

content = content.replace(/export default function MatchesClient\(\) {/, maskFunctions + '\nexport default function MatchesClient() {');

const newCardBody = `
                <div className="flex-1 flex flex-col">
                  {/* Shop Name & Website Link */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="font-black text-2xl text-slate-900 tracking-tight leading-snug group-hover:text-blue-600 transition-colors">
                        {shop.shop_name}
                      </h3>
                      {shop.formatted_address ? (
                        <span className="text-xs text-slate-500 font-medium mt-1 block truncate w-[280px]" title={shop.formatted_address}>
                          {shop.formatted_address}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium italic mt-1 block">No Address Listed</span>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end shrink-0">
                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-xl border border-amber-200/50">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-black text-amber-800">{shop.rating || "4.8"}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 mt-1">{shop.total_reviews || 120} Reviews</span>
                    </div>
                  </div>

                  {/* Specialty place tags */}
                  {shop.place_types && shop.place_types.split('|').length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {shop.place_types.split('|').map(t => t.trim().replace(/_/g, ' ')).slice(0, 3).map((tag: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-lg border border-slate-200/40">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Hiring Specifications */}
                  <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 grid grid-cols-2 gap-4 mb-4 text-xs font-semibold">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Available Chairs</span>
                      <span className="font-extrabold text-slate-800 flex items-center gap-1">
                        <Scissors className="w-3.5 h-3.5 text-blue-500" />
                        {shop.booth_count_available > 0 ? \`\${shop.booth_count_available} Chairs\` : "No Chairs (Waitlist)"}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Compensation</span>
                      <span className="font-extrabold text-slate-800 flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                        {shop.rent_type && shop.rent_type !== "Unknown" ? shop.rent_type : "Booth Rent / Commission"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5 border-t border-slate-200/60 pt-2 col-span-2">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Rent Rate</span>
                      <span className="font-black text-blue-600 text-sm flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        {shop.rent_rate ? shop.rent_rate : "Negotiable (Claim to update)"}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-0.5 border-t border-slate-200/60 pt-2 col-span-2">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Desired Specialties</span>
                      <span className="font-bold text-slate-700 bg-white border border-slate-200/80 px-2 py-1 rounded-lg mt-0.5 max-w-max text-[11px]">
                        {shop.specialty_desired && shop.specialty_desired !== "Unknown" ? shop.specialty_desired : "General Fades, Lineups & Shaves"}
                      </span>
                    </div>
                  </div>

                  {/* Owner & Obscured Contact Info Card */}
                  <div className="border border-slate-200 rounded-2xl p-4 mb-4 bg-slate-50/40 relative overflow-hidden">
                    <div className="absolute top-3 right-3 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    
                    <div className="space-y-2 text-xs font-semibold">
                      <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-black uppercase tracking-wider mb-1">
                        <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                        Verified Owner Profile
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Owner Name:</span>
                        <span className="text-slate-700 font-bold">{shop.owner_name && shop.owner_name !== "Unknown Owner" ? shop.owner_name : "Unclaimed (Claim to add)"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Email Address:</span>
                        <span className="text-slate-700 font-bold font-mono">{maskEmail(shop.email)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Owner Phone:</span>
                        <span className="text-slate-700 font-bold font-mono">{maskPhone(shop.phone)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Call to action */}
                  <div className="mt-auto pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleRequestShopDay(shop.id)}
                      disabled={isRequested}
                      className={\`w-full py-3.5 mt-2 rounded-xl font-bold text-sm transition-colors inline-flex items-center justify-center gap-2 shadow-md active:scale-[0.98] \${
                        isRequested 
                          ? "bg-green-50 border border-green-200 text-green-700 shadow-none cursor-default" 
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10 hover:shadow-blue-500/20 cursor-pointer"
                      }\`}
                    >
                      {isRequested ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Shop Day Requested
                        </>
                      ) : (
                        <>
                          <Scissors className="w-4 h-4 text-blue-400" />
                          Request Shop Day
                        </>
                      )}
                    </button>
                  </div>
                </div>`;

content = content.replace(/<div className="flex-1 flex flex-col">[\s\S]*?(?=<div className="mt-auto pt-2">)[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\)\;/g, newCardBody + '\n              </div>\n            );\n');

fs.writeFileSync('app/shop-day-matches/MatchesClient.tsx', content);
