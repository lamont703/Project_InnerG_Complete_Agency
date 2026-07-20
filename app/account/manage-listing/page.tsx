"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Store, ShieldCheck, ArrowLeft, Save, ImagePlus, X, Camera } from "lucide-react"
import { toast } from "sonner"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { createBrowserClient } from "@/lib/supabase/browser"

const MAX_IMAGES = 5

interface OwnedEntity {
  entityType: "shop" | "salon"
  id: string
  slug: string
  shop_name: string | null
  owner_name: string | null
  phone: string | null
  email: string | null
  website: string | null
  formatted_address: string | null
  hiring_need: boolean | null
  rent_type: string | null
  rent_rate: string | null
  booth_count_available: number | null
  specialty_desired: string | null
  ai_culture_summary: string | null
  google_images: string[] | null
}

// Templated so it works for either linked entity type (shops and salons
// share the exact same underlying schema — see the 20260720000000
// migration's notes) without needing two separate pages. Reachable from
// the Navbar's Account dropdown once a member has been linked to an
// entity via /admin/community-entity-links.
export default function ManageListingPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [entity, setEntity] = useState<OwnedEntity | null>(null)
  const [form, setForm] = useState<Partial<OwnedEntity>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [pendingSlot, setPendingSlot] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetSlot = useRef<number | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login?redirect=/account/manage-listing")
        return
      }
      setAuthChecked(true)
    })
  }, [router])

  useEffect(() => {
    if (!authChecked) return
    fetch("/api/account/my-listing")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setEntity(data.data)
          setForm(data.data || {})
          setImages(Array.isArray(data.data?.google_images) ? data.data.google_images : [])
        } else {
          toast.error(data.error || "Failed to load your listing.")
        }
      })
      .finally(() => setIsLoading(false))
  }, [authChecked])

  const handleChange = (field: keyof OwnedEntity, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const triggerUpload = (slotIndex: number | null) => {
    uploadTargetSlot.current = slotIndex
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file later
    if (!file) return

    const slotIndex = uploadTargetSlot.current
    setPendingSlot(slotIndex ?? images.length)

    try {
      const formData = new FormData()
      formData.append("file", file)
      if (slotIndex != null) formData.append("slotIndex", String(slotIndex))

      const res = await fetch("/api/account/my-listing/images", { method: "POST", body: formData })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setImages(data.data.images)
      toast.success("Photo uploaded.")
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo.")
    } finally {
      setPendingSlot(null)
    }
  }

  const handleRemoveImage = async (index: number) => {
    setPendingSlot(index)
    try {
      const res = await fetch("/api/account/my-listing/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setImages(data.data.images)
      toast.success("Photo removed.")
    } catch (err: any) {
      toast.error(err.message || "Failed to remove photo.")
    } finally {
      setPendingSlot(null)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const res = await fetch("/api/account/my-listing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success("Listing updated.")
      setEntity((prev) => (prev ? { ...prev, ...form } as OwnedEntity : prev))
    } catch (err: any) {
      toast.error(err.message || "Failed to save changes.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />
      <main className="flex-1 pt-28 pb-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back home
          </Link>

          {isLoading || !authChecked ? (
            <div className="flex items-center justify-center py-24 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading your listing...
            </div>
          ) : !entity ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
              <Store className="h-10 w-10 text-slate-300 mx-auto mb-4" />
              <h1 className="text-lg font-black text-slate-900 mb-2">No Business Linked Yet</h1>
              <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                Your community membership isn't linked to a shop or salon yet. Once your business is verified and
                linked, you'll be able to manage its details here.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 mb-3">
                  <ShieldCheck className="w-3 h-3" />
                  Claimed {entity.entityType === "shop" ? "Barbershop" : "Salon"}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Manage Your Listing</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Update the details shown on{" "}
                  <Link href={`/${entity.entityType === "shop" ? "shop" : "salons"}/${entity.slug}`} className="font-bold text-indigo-600 hover:underline">
                    your public profile page
                  </Link>
                  .
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelected}
                className="hidden"
              />

              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 mb-6">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-slate-400" />
                    Photos
                  </h2>
                  <span className="text-xs font-bold text-slate-400">{images.length}/{MAX_IMAGES}</span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Up to {MAX_IMAGES} photos shown on your public profile page. Tap a photo to replace it, or the X to remove it.
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {images.map((url, index) => (
                    <div key={`${url}-${index}`} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                      <button
                        type="button"
                        onClick={() => triggerUpload(index)}
                        disabled={pendingSlot === index}
                        className="absolute inset-0 w-full h-full"
                      >
                        <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          {pendingSlot === index ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          ) : (
                            <ImagePlus className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        disabled={pendingSlot === index}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition-colors z-10"
                        aria-label="Remove photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => triggerUpload(null)}
                      disabled={pendingSlot === images.length}
                      className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-indigo-600"
                    >
                      {pendingSlot === images.length ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <ImagePlus className="w-5 h-5" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Add Photo</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Business Name">
                    <input
                      type="text"
                      value={form.shop_name || ""}
                      onChange={(e) => handleChange("shop_name", e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                    />
                  </Field>
                  <Field label="Owner Name">
                    <input
                      type="text"
                      value={form.owner_name || ""}
                      onChange={(e) => handleChange("owner_name", e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                    />
                  </Field>
                </div>

                <Field label="Address">
                  <input
                    type="text"
                    value={form.formatted_address || ""}
                    onChange={(e) => handleChange("formatted_address", e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Phone">
                    <input
                      type="tel"
                      value={form.phone || ""}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      value={form.email || ""}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                    />
                  </Field>
                </div>

                <Field label="Website">
                  <input
                    type="text"
                    placeholder="yourshop.com"
                    value={form.website || ""}
                    onChange={(e) => handleChange("website", e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                  />
                </Field>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Booth Rent &amp; Hiring</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Rent Type">
                      <select
                        value={form.rent_type || ""}
                        onChange={(e) => handleChange("rent_type", e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                      >
                        <option value="">Not set</option>
                        <option value="Booth Rent">Booth Rent</option>
                        <option value="Commission">Commission</option>
                      </select>
                    </Field>
                    <Field label="Weekly Rate">
                      <input
                        type="text"
                        placeholder="e.g. $175/week"
                        value={form.rent_rate || ""}
                        onChange={(e) => handleChange("rent_rate", e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                      />
                    </Field>
                    <Field label="Chairs Available">
                      <input
                        type="number"
                        min={0}
                        value={form.booth_count_available ?? ""}
                        onChange={(e) => handleChange("booth_count_available", e.target.value === "" ? null : Number(e.target.value))}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                      />
                    </Field>
                    <Field label="Specialty Desired">
                      <input
                        type="text"
                        placeholder="e.g. Fades, Color, Braids"
                        value={form.specialty_desired || ""}
                        onChange={(e) => handleChange("specialty_desired", e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                      />
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 mt-4 cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      checked={!!form.hiring_need}
                      onChange={(e) => handleChange("hiring_need", e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold text-slate-700">Currently hiring / accepting booth renters</span>
                  </label>
                </div>

                <Field label="About Your Shop">
                  <textarea
                    rows={4}
                    placeholder="Tell customers and prospective barbers what makes your shop stand out..."
                    value={form.ai_culture_summary || ""}
                    onChange={(e) => handleChange("ai_culture_summary", e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-indigo-500 focus:ring-0 transition-all outline-none resize-none"
                  />
                </Field>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-3 text-sm font-black uppercase tracking-[0.15em] rounded-xl transition-all shadow-lg"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
      {children}
    </div>
  )
}
