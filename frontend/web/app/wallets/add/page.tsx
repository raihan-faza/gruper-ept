"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import { CreateWallet as CreateWalletApi } from "@/app/api/wallet/wallet"
import { useDatabase } from "@/lib/db/hooks"
import { createWalletRepository } from "@/lib/db/repositories/wallet.repository"
import { useUserId } from "@/lib/auth-client"
import { motion, AnimatePresence } from "framer-motion"

const CURRENCIES = [
  { code: "USD", name: "United States Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "GBP", name: "British Pound Sterling" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "KRW", name: "South Korean Won" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "INR", name: "Indian Rupee" },
  { code: "RUB", name: "Russian Ruble" },
  { code: "ZAR", name: "South African Rand" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "AED", name: "United Arab Emirates Dirham" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "THB", name: "Thai Baht" },
  { code: "VND", name: "Vietnamese Dong" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "AFN", name: "Afghan Afghani" },
  { code: "ALL", name: "Albanian Lek" },
  { code: "AMD", name: "Armenian Dram" },
  { code: "ANG", name: "Netherlands Antillean Guilder" },
  { code: "AOA", name: "Angolan Kwanza" },
  { code: "ARS", name: "Argentine Peso" },
  { code: "AWG", name: "Aruban Florin" },
  { code: "AZN", name: "Azerbaijani Manat" },
  { code: "BAM", name: "Bosnia-Herzegovina Convertible Mark" },
  { code: "BBD", name: "Barbadian Dollar" },
  { code: "BDT", name: "Bangladeshi Taka" },
  { code: "BGN", name: "Bulgarian Lev" },
  { code: "BHD", name: "Bahraini Dinar" },
  { code: "BIF", name: "Burundian Franc" },
  { code: "BMD", name: "Bermudian Dollar" },
  { code: "BND", name: "Brunei Dollar" },
  { code: "BOB", name: "Bolivian Boliviano" },
  { code: "BSD", name: "Bahamian Dollar" },
  { code: "BTN", name: "Bhutanese Ngultrum" },
  { code: "BWP", name: "Botswanan Pula" },
  { code: "BYN", name: "Belarusian Ruble" },
  { code: "BZD", name: "Belize Dollar" },
  { code: "CDF", name: "Congolese Franc" },
  { code: "CLP", name: "Chilean Peso" },
  { code: "COP", name: "Colombian Peso" },
  { code: "CRC", name: "Costa Rican Colón" },
  { code: "CUP", name: "Cuban Peso" },
  { code: "CVE", name: "Cape Verdean Escudo" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "DJF", name: "Djiboutian Franc" },
  { code: "DKK", name: "Danish Krone" },
  { code: "DOP", name: "Dominican Peso" },
  { code: "DZD", name: "Algerian Dinar" },
  { code: "EGP", name: "Egyptian Pound" },
  { code: "ERN", name: "Eritrean Nakfa" },
  { code: "ETB", name: "Ethiopian Birr" },
  { code: "FJD", name: "Fijian Dollar" },
  { code: "FKP", name: "Falkland Islands Pound" },
  { code: "GEL", name: "Georgian Lari" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "GIP", name: "Gibraltar Pound" },
  { code: "GMD", name: "Gambian Dalasi" },
  { code: "GNF", name: "Guinean Franc" },
  { code: "GTQ", name: "Guatemalan Quetzal" },
  { code: "GYD", name: "Guyanese Dollar" },
  { code: "HNL", name: "Honduran Lempira" },
  { code: "HRK", name: "Croatian Kuna" },
  { code: "HTG", name: "Haitian Gourde" },
  { code: "HUF", name: "Hungarian Forint" },
  { code: "ILS", name: "Israeli New Shekel" },
  { code: "IQD", name: "Iraqi Dinar" },
  { code: "IRR", name: "Iranian Rial" },
  { code: "ISK", name: "Icelandic Króna" },
  { code: "JMD", name: "Jamaican Dollar" },
  { code: "JOD", name: "Jordanian Dinar" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "KGS", name: "Kyrgystani Som" },
  { code: "KHR", name: "Cambodian Riel" },
  { code: "KMF", name: "Comorian Franc" },
  { code: "KPW", name: "North Korean Won" },
  { code: "KWD", name: "Kuwaiti Dinar" },
  { code: "KYD", name: "Cayman Islands Dollar" },
  { code: "KZT", name: "Kazakhstani Tenge" },
  { code: "LAK", name: "Laotian Kip" },
  { code: "LBP", name: "Lebanese Pound" },
  { code: "LKR", name: "Sri Lankan Rupee" },
  { code: "LRD", name: "Liberian Dollar" },
  { code: "LSL", name: "Lesotho Loti" },
  { code: "LYD", name: "Libyan Dinar" },
  { code: "MAD", name: "Moroccan Dirham" },
  { code: "MDL", name: "Moldovan Leu" },
  { code: "MGA", name: "Malagasy Ariary" },
  { code: "MKD", name: "Macedonian Denar" },
  { code: "MMK", name: "Myanmar Kyat" },
  { code: "MNT", name: "Mongolian Tughrik" },
  { code: "MOP", name: "Macanese Pataca" },
  { code: "MRU", name: "Mauritanian Ouguiya" },
  { code: "MUR", name: "Mauritian Rupee" },
  { code: "MVR", name: "Maldivian Rufiyaa" },
  { code: "MWK", name: "Malawian Kwacha" },
  { code: "MZN", name: "Mozambican Metical" },
  { code: "NAD", name: "Namibian Dollar" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "NIO", name: "Nicaraguan Córdoba" },
  { code: "NPR", name: "Nepalese Rupee" },
  { code: "OMR", name: "Omani Rial" },
  { code: "PAB", name: "Panamanian Balboa" },
  { code: "PEN", name: "Peruvian Sol" },
  { code: "PGK", name: "Papua New Guinean Kina" },
  { code: "PKR", name: "Pakistani Rupee" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "PYG", name: "Paraguayan Guarani" },
  { code: "QAR", name: "Qatari Riyal" },
  { code: "RON", name: "Romanian Leu" },
  { code: "RSD", name: "Serbian Dinar" },
  { code: "RWF", name: "Rwandan Franc" },
  { code: "SBD", name: "Solomon Islands Dollar" },
  { code: "SCR", name: "Seychellois Rupee" },
  { code: "SDG", name: "Sudanese Pound" },
  { code: "SHP", name: "St. Helena Pound" },
  { code: "SLE", name: "Sierra Leonean Leone" },
  { code: "SLL", name: "Sierra Leonean Leone (old)" },
  { code: "SOS", name: "Somali Shilling" },
  { code: "SRD", name: "Surinamese Dollar" },
  { code: "SSP", name: "South Sudanese Pound" },
  { code: "STN", name: "São Tomé & Príncipe Dobra" },
  { code: "SVC", name: "Salvadoran Colón" },
  { code: "SYP", name: "Syrian Pound" },
  { code: "SZL", name: "Swazi Lilangeni" },
  { code: "TJS", name: "Tajikistani Somoni" },
  { code: "TMT", name: "Turkmenistani Manat" },
  { code: "TND", name: "Tunisian Dinar" },
  { code: "TOP", name: "Tongan Paʻanga" },
  { code: "TTD", name: "Trinidad & Tobago Dollar" },
  { code: "TWD", name: "New Taiwan Dollar" },
  { code: "TZS", name: "Tanzanian Shilling" },
  { code: "UAH", name: "Ukrainian Hryvnia" },
  { code: "UGX", name: "Ugandan Shilling" },
  { code: "UYU", name: "Uruguayan Peso" },
  { code: "UZS", name: "Uzbekistani Som" },
  { code: "VES", name: "Venezuelan Bolívar" },
  { code: "VUV", name: "Vanuatu Vatu" },
  { code: "WST", name: "Samoan Tala" },
  { code: "XAF", name: "Central African CFA Franc" },
  { code: "XCD", name: "East Caribbean Dollar" },
  { code: "XOF", name: "West African CFA Franc" },
  { code: "XPF", name: "CFP Franc" },
  { code: "YER", name: "Yemeni Rial" },
  { code: "ZMW", name: "Zambian Kwacha" },
  { code: "ZWL", name: "Zimbabwean Dollar" }
].sort((a, b) => a.code.localeCompare(b.code));

export default function CreateWallet() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [initialBalance, setInitialBalance] = useState<string>("0")
  const [currency, setCurrency] = useState("IDR")
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  const userId = useUserId()
  const db = useDatabase()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim()) return

    setIsPending(true)
    setError(null)

    try {
      try {
        const response = await CreateWalletApi({
          wallet_name: name.trim(),
          initial_balance: Number(initialBalance) || 0,
          currency: currency
        })
        if (response?.error) {
          throw new Error(response.error)
        }
        // Cache the server-created wallet locally so it's available offline immediately
        if (db) {
          const serverWallet = response?.data ?? response
          if (serverWallet?.id) {
            const walletRepo = createWalletRepository(db)
            await walletRepo.upsertFromServer({
              id: serverWallet.id,
              name: serverWallet.name ?? serverWallet.wallet_name ?? name.trim(),
              total_balance: serverWallet.total_balance ?? serverWallet.balance ?? (Number(initialBalance) || 0),
              owner_id: serverWallet.owner_id ?? userId ?? '',
              currency: serverWallet.currency ?? currency,
              idempotency_key: serverWallet.idempotency_key ?? '',
              is_new: false,
              created_at: serverWallet.created_at ?? new Date().toISOString(),
              updated_at: serverWallet.updated_at ?? new Date().toISOString(),
            })
          }
        }
      } catch (apiErr) {
        console.error("Failed to create wallet on server, saving to RxDB:", apiErr)
        if (db) {
          const walletRepo = createWalletRepository(db)
          await walletRepo.create({
            name: name.trim(),
            total_balance: Number(initialBalance) || 0,
            owner_id: userId || 'offline-user',
            currency: currency,
            is_new: true,
          })
        } else {
          throw apiErr
        }
      }

      router.push("/wallets")
    } catch (err: any) {
      setError(err.message || "Failed to create wallet.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-16 sm:px-6">
        {/* Floating Back Button */}
        <div className="mb-6 flex justify-start">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900/90 text-slate-300 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-500 hover:bg-cyan-500 hover:text-slate-950 shadow-sm shadow-slate-950/20"
            aria-label="Back to wallets"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        </div>

        {/* Header */}
        <div className="mb-6 sm:mb-10">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
            Wallets
          </p>
          <h1 className="mt-2 sm:mt-3 text-2xl font-semibold tracking-tight text-white sm:text-4xl">
            Create a new wallet
          </h1>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-slate-400">
            Set up a shared wallet to track group expenses together.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 flex gap-3 rounded-xl sm:rounded-2xl border border-red-500/30 bg-red-500/10 p-3 sm:p-4 text-xs sm:text-sm text-red-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="h-5 w-5 shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form card */}
        <div className="rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/95 p-5 sm:p-8 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.8)]">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Wallet name */}
            <div className="space-y-1.5">
              <label
                htmlFor="wallet-name"
                className="block text-xs sm:text-sm font-semibold text-slate-200"
              >
                Wallet name
                <span className="ml-1 text-cyan-400">*</span>
              </label>
              <input
                id="wallet-name"
                type="text"
                name="wallet_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Travel Fund, House Budget…"
                required
                className="w-full rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 sm:py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition duration-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label
                htmlFor="wallet-description"
                className="block text-xs sm:text-sm font-semibold text-slate-200"
              >
                Description
                <span className="ml-1 text-slate-500 font-normal text-xs">(optional)</span>
              </label>
              <textarea
                id="wallet-description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this wallet for?"
                rows={3}
                className="w-full resize-none rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 sm:py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition duration-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>

            {/* Initial Balance & Currency Grid */}
            <div className="grid gap-4 sm:gap-6">
              {/* Initial balance */}
              <div className="space-y-1.5">
                <label
                  htmlFor="initial-balance"
                  className="block text-xs sm:text-sm font-semibold text-slate-200"
                >
                  Initial balance
                  <span className="ml-1 text-cyan-400">*</span>
                </label>
                <input
                  id="initial-balance"
                  type="number"
                  name="initial_balance"
                  min="0"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="0"
                  required
                  className="w-full rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 sm:py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition duration-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              {/* Currency (Commented out for now, automatically defaults to IDR)
              <div className="space-y-1.5 animate-none" ref={dropdownRef}>
                <label
                  className="block text-xs sm:text-sm font-semibold text-slate-200"
                >
                  Currency
                  <span className="ml-1 text-cyan-400">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(!isDropdownOpen)
                      setSearchQuery("")
                    }}
                    className="flex w-full items-center justify-between rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 sm:py-3 text-left text-sm text-slate-100 outline-none transition duration-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  >
                    <span className="truncate">
                      {currency} - {CURRENCIES.find((c) => c.code === currency)?.name}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl backdrop-blur-xl"
                      >
                        <div className="relative mb-2">
                          <input
                            type="text"
                            placeholder="Search currency..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 pl-9 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500"
                          />
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="2"
                              stroke="currentColor"
                              className="h-3.5 w-3.5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.604 10.604Z"
                              />
                            </svg>
                          </div>
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-0.5 scrollbar-thin">
                          {(() => {
                            const filtered = CURRENCIES.filter(
                              (c) =>
                                c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                c.name.toLowerCase().includes(searchQuery.toLowerCase())
                            );
                            if (filtered.length > 0) {
                              return filtered.map((c) => (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => {
                                    setCurrency(c.code)
                                    setIsDropdownOpen(false)
                                  }}
                                  className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-xs transition hover:bg-slate-800 ${
                                    currency === c.code
                                      ? "bg-cyan-500 text-slate-950 font-bold"
                                      : "text-slate-200"
                                  }`}
                                >
                                  <span className="font-semibold mr-2">{c.code}</span>
                                  <span className="truncate opacity-80">{c.name}</span>
                                </button>
                              ));
                            }
                            return (
                              <div className="py-3 text-center text-xs text-slate-500">
                                No currencies found
                              </div>
                            );
                          })()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              */ }
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-full border border-slate-700 bg-slate-800/60 px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-300 transition duration-200 hover:border-slate-500 hover:text-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !name.trim()}
                className="flex items-center justify-center gap-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-8 py-2 sm:py-2.5 text-xs sm:text-sm font-bold shadow-lg shadow-cyan-500/20 transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin text-slate-950"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Creating…
                  </>
                ) : (
                  "Create wallet"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
