import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Wallet as WalletIcon,
  PlusCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Printer,
  Download,
  ShieldCheck,
  AlertCircle,
  X,
  CreditCard,
  Building,
  ExternalLink
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Wallet, WalletTransaction, WalletReceipt, TopUpInitializeResponse, TopUpVerifyResponse } from '../../types';

export const ProfessionalWalletPage: React.FC = () => {
  const { user } = useAuth();
  const { t, formatDate } = useLanguage();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter state
  const [filterType, setFilterType] = useState<'all' | 'topup' | 'fee'>('all');

  // Top-Up Modal State
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(250);
  const [customAmount, setCustomAmount] = useState<string>('250');
  const [topUpError, setTopUpError] = useState<string | null>(null);

  // Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<WalletReceipt | null>(null);
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);

  // Verification state (from Chapa redirect query param)
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failed'>('idle');
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  // Query: Wallet Summary
  const {
    data: wallet,
    isLoading: isWalletLoading,
    isRefetching: isWalletRefetching,
    refetch: refetchWallet
  } = useQuery<Wallet>({
    queryKey: ['pro-wallet'],
    queryFn: async () => {
      const res = await api.get('/wallet/');
      return res.data;
    },
  });

  // Query: Transactions List
  const {
    data: transactions = [],
    isLoading: isTxLoading,
    refetch: refetchTransactions
  } = useQuery<WalletTransaction[]>({
    queryKey: ['pro-wallet-transactions', filterType],
    queryFn: async () => {
      const params = filterType !== 'all' ? `?type=${filterType}` : '';
      const res = await api.get(`/wallet/transactions/${params}`);
      return res.data;
    },
  });

  // Check for return from Chapa
  useEffect(() => {
    const ref = searchParams.get('reference') || searchParams.get('trx_ref') || searchParams.get('tx_ref');
    const statusParam = (searchParams.get('status') || '').toLowerCase();

    if (ref && verificationStatus === 'idle') {
      if (statusParam === 'cancelled' || statusParam === 'failed') {
        setVerificationStatus('failed');
        setVerificationMessage('Payment was cancelled or failed on Chapa.');
        setSearchParams({});
      } else {
        verifyTopUp(ref);
      }
    }
  }, [searchParams, verificationStatus]);

  const verifyTopUp = async (reference: string) => {
    setVerificationStatus('verifying');
    try {
      const res = await api.post<TopUpVerifyResponse>('/wallet/topup/verify/', { reference });
      
      if (res.data.status === 'PENDING') {
        setVerificationStatus('idle');
        setVerificationMessage(res.data.message || 'Payment is still processing on Chapa.');
        return;
      }

      setVerificationStatus('success');
      setVerificationMessage(t('wallet.payment_verified_success'));
      
      if (res.data.receipt) {
        setSelectedReceipt(res.data.receipt);
        if (res.data.transaction) {
          setSelectedTxId(res.data.transaction.id);
        }
      }

      // Synchronously update query cache so the Current Balance card updates immediately
      if (res.data.wallet_balance !== undefined) {
        queryClient.setQueryData<Wallet>(['pro-wallet'], (old) => {
          if (!old) return old;
          return {
            ...old,
            balance: String(res.data.wallet_balance)
          };
        });
      }

      // Background refetch both wallet and transactions for complete ledger accuracy
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['pro-wallet'] }),
        queryClient.refetchQueries({ queryKey: ['pro-wallet-transactions'] })
      ]);
    } catch (err: any) {
      setVerificationStatus('failed');
      const detail = err.response?.data?.detail || err.response?.data?.message || t('wallet.payment_verification_failed');
      setVerificationMessage(detail);
    } finally {
      // Clear URL params without reloading page
      setSearchParams({});
    }
  };

  // Mutation: Initialize Top-Up
  const initTopUpMutation = useMutation({
    mutationFn: async (amount: number) => {
      const returnUrl = `${window.location.origin}/professional/wallet`;
      const res = await api.post<TopUpInitializeResponse>('/wallet/topup/initialize/', {
        amount,
        return_url: returnUrl,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setShowTopUpModal(false);
      if (data.checkout_url) {
        // Redirect to Chapa hosted payment page
        window.location.href = data.checkout_url;
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.response?.data?.amount?.[0] || 'Unable to initialize payment.';
      setTopUpError(msg);
    },
  });

  const handleSelectPreset = (amount: number) => {
    setTopUpAmount(amount);
    setCustomAmount(amount.toString());
    setTopUpError(null);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomAmount(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      setTopUpAmount(parsed);
    }
    setTopUpError(null);
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (topUpAmount < 50) {
      setTopUpError('Minimum top-up amount is 50 ETB.');
      return;
    }
    if (topUpAmount > 100000) {
      setTopUpError('Maximum single top-up amount is 100,000 ETB.');
      return;
    }
    initTopUpMutation.mutate(topUpAmount);
  };

  // Load and show receipt for a specific transaction
  const handleOpenReceipt = async (txId: number) => {
    setIsLoadingReceipt(true);
    setSelectedTxId(txId);
    try {
      const res = await api.get<WalletReceipt>(`/wallet/transactions/${txId}/receipt/`);
      setSelectedReceipt(res.data);
    } catch {
      alert('Unable to load receipt details.');
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  const handleDownloadHtmlReceipt = (txId: number) => {
    const url = `/api/wallet/transactions/${txId}/receipt/html/`;
    window.open(url, '_blank');
  };

  const currentBalance = wallet ? parseFloat(wallet.balance) : 0;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Verification Notice Banner */}
      {verificationStatus === 'verifying' && (
        <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center space-x-3">
          <RefreshCw size={20} className="animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
            {t('wallet.verifying_payment')}
          </p>
        </div>
      )}

      {verificationStatus === 'success' && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
              {verificationMessage || t('wallet.payment_verified_success')}
            </p>
          </div>
          <button
            onClick={() => setVerificationStatus('idle')}
            className="text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {verificationStatus === 'failed' && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle size={20} className="text-rose-600 dark:text-rose-400" />
            <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
              {verificationMessage || t('wallet.payment_verification_failed')}
            </p>
          </div>
          <button
            onClick={() => setVerificationStatus('idle')}
            className="text-xs text-rose-700 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-200"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            FixIt Ethiopia
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
            {t('wallet.page_title')}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
            {t('wallet.page_subtitle')}
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => {
              refetchWallet();
              refetchTransactions();
            }}
            disabled={isWalletRefetching}
            className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl shadow-2xs transition-colors"
          >
            <RefreshCw size={14} className={isWalletRefetching ? 'animate-spin' : ''} />
            <span>{t('wallet.refresh_btn')}</span>
          </button>
          <button
            onClick={() => {
              setShowTopUpModal(true);
              setTopUpError(null);
            }}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <PlusCircle size={15} />
            <span>{t('wallet.top_up_btn')}</span>
          </button>
        </div>
      </div>

      {/* Balance Card & Policy Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Main Balance Card */}
        <div className="lg:col-span-2 p-6 sm:p-8 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-900 text-white rounded-3xl shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <WalletIcon size={20} className="text-indigo-300" />
              </div>
              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-300">
                  {t('wallet.current_balance')}
                </span>
                <p className="text-xs text-indigo-200">
                  {user?.full_name || user?.username}
                </p>
              </div>
            </div>

            <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold rounded-full">
              Chapa Test Mode
            </span>
          </div>

          <div className="my-6">
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                {isWalletLoading ? '...' : currentBalance.toFixed(2)}
              </span>
              <span className="text-xl font-bold text-indigo-300">
                {t('wallet.currency_label')}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/10">
            <button
              onClick={() => {
                setShowTopUpModal(true);
                setTopUpError(null);
              }}
              className="px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold rounded-xl transition-colors inline-flex items-center space-x-1.5 shadow-2xs"
            >
              <PlusCircle size={14} className="text-indigo-600" />
              <span>{t('wallet.top_up_btn')}</span>
            </button>
            <span className="text-xs text-slate-300">
              Min. Top-Up: 50.00 ETB · Instant crediting
            </span>
          </div>
        </div>

        {/* Acceptance Fee Policy Card */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-3">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Job Acceptance Policy
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              FixIt charges exactly <strong className="text-slate-900 dark:text-white">50 ETB</strong> from your wallet when you accept any dispatched customer request.
            </p>
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
              <p>• Deducted immediately upon request acceptance.</p>
              <p>• Reveals customer contact info and direct phone.</p>
              <p>• Fee is non-refundable upon acceptance.</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Fixed Platform Fee:</span>
            <span className="font-extrabold text-slate-900 dark:text-white">50.00 ETB</span>
          </div>
        </div>
      </div>

      {/* Ledger Transactions Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('wallet.transactions_title')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('wallet.transactions_subtitle')}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filterType === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('wallet.filter_all')}
            </button>
            <button
              onClick={() => setFilterType('topup')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filterType === 'topup'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('wallet.filter_topups')}
            </button>
            <button
              onClick={() => setFilterType('fee')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filterType === 'fee'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('wallet.filter_fees')}
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        {isTxLoading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FileText size={24} />
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {t('wallet.empty_transactions')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {t('wallet.empty_transactions_sub')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left text-xs min-w-[680px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">{t('wallet.table_date')}</th>
                  <th className="py-3 px-4 font-semibold">{t('wallet.table_type')}</th>
                  <th className="py-3 px-4 font-semibold">{t('wallet.table_reference')}</th>
                  <th className="py-3 px-4 font-semibold">{t('wallet.table_amount')}</th>
                  <th className="py-3 px-4 font-semibold">{t('wallet.table_balance_after')}</th>
                  <th className="py-3 px-4 font-semibold">{t('wallet.table_status')}</th>
                  <th className="py-3 px-4 font-semibold text-right">{t('wallet.table_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.map((tx) => {
                  const isTopUp = tx.transaction_type === 'TOPUP';
                  const amountNum = parseFloat(tx.amount);
                  const isPositive = amountNum > 0;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                        {formatDate(tx.created_at)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isTopUp
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {isTopUp ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {isTopUp ? t('wallet.type_topup') : t('wallet.type_fee')}
                            </p>
                            {tx.service_request_title && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                #{tx.service_request}: {tx.service_request_title}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <span className="truncate max-w-[140px] sm:max-w-[180px] md:max-w-[220px] inline-block align-middle" title={tx.reference}>
                          {tx.reference}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold whitespace-nowrap">
                        <span
                          className={
                            isPositive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-900 dark:text-white'
                          }
                        >
                          {isPositive ? `+${amountNum.toFixed(2)}` : amountNum.toFixed(2)} ETB
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {parseFloat(tx.balance_after).toFixed(2)} ETB
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {(tx.status === 'COMPLETED' || tx.status === 'SUCCESS') && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                            <CheckCircle2 size={11} />
                            <span>{t('wallet.status_success')}</span>
                          </span>
                        )}
                        {tx.status === 'PENDING' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80">
                            <Clock size={11} />
                            <span>{t('wallet.status_pending')}</span>
                          </span>
                        )}
                        {tx.status === 'FAILED' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80">
                            <XCircle size={11} />
                            <span>{t('wallet.status_failed')}</span>
                          </span>
                        )}
                        {tx.status === 'CANCELLED' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <span>{t('wallet.status_cancelled')}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {tx.receipt_available ? (
                          <button
                            onClick={() => handleOpenReceipt(tx.id)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                          >
                            <FileText size={12} />
                            <span>{t('wallet.view_receipt')}</span>
                          </button>
                        ) : tx.status === 'PENDING' && isTopUp ? (
                          <button
                            onClick={() => verifyTopUp(tx.reference)}
                            disabled={verificationStatus === 'verifying'}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition-colors border border-amber-200 dark:border-amber-800/60"
                            title="Verify payment with Chapa"
                          >
                            <RefreshCw size={11} className={verificationStatus === 'verifying' ? 'animate-spin' : ''} />
                            <span>Verify Now</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top-Up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-xl transition-colors relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowTopUpModal(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={20} />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('wallet.topup_modal_title')}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Chapa Test Gateway · Instant Settlement
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
              {t('wallet.topup_modal_desc')}
            </p>

            <form onSubmit={handleProceedToPayment} className="space-y-4">
              {/* Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {t('wallet.preset_amounts')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[100, 250, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleSelectPreset(amt)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-colors ${
                        topUpAmount === amt
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      +{amt} ETB
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('wallet.custom_amount_label')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="50"
                    max="100000"
                    step="1"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    placeholder={t('wallet.custom_amount_placeholder')}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
                    ETB
                  </span>
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 flex items-start space-x-2">
                <Building size={14} className="text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Supported methods in Chapa Test Mode: Telebirr, CBE Birr, Awash Birr, and test credit cards.
                </span>
              </div>

              {topUpError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium">
                  {topUpError}
                </div>
              )}

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={initTopUpMutation.isPending}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 inline-flex items-center justify-center space-x-1.5"
                >
                  {initTopUpMutation.isPending ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>{t('wallet.initiating_payment')}</span>
                    </>
                  ) : (
                    <span>{t('wallet.proceed_to_checkout')}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-8 shadow-2xl transition-colors relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={20} />
            </button>

            {/* Receipt Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
              <div>
                <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                  FixIt Ethiopia
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {t('wallet.receipt_modal_title')}
                </h3>
              </div>
              <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-bold">
                {selectedReceipt.status}
              </span>
            </div>

            {/* Amount Banner */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-center mb-5 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t('wallet.verified_amount')}
              </span>
              <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                {typeof selectedReceipt.amount === 'number'
                  ? selectedReceipt.amount.toFixed(2)
                  : parseFloat(selectedReceipt.amount).toFixed(2)}{' '}
                {selectedReceipt.currency}
              </p>
            </div>

            {/* Receipt Meta Grid */}
            <div className="space-y-2.5 text-xs border-b border-slate-100 dark:border-slate-800 pb-5 mb-5">
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                <span className="text-slate-500 dark:text-slate-400">{t('wallet.receipt_number')}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedReceipt.receipt_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                <span className="text-slate-500 dark:text-slate-400">{t('wallet.pro_name')}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedReceipt.professional_name}</span>
              </div>
              {selectedReceipt.professional_phone && (
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-500 dark:text-slate-400">{t('wallet.phone_number')}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedReceipt.professional_phone}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                <span className="text-slate-500 dark:text-slate-400">{t('common.date')}</span>
                <span className="font-medium text-slate-900 dark:text-white">{formatDate(selectedReceipt.date)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                <span className="text-slate-500 dark:text-slate-400 shrink-0 pr-2">{t('wallet.merchant_ref')}</span>
                <span className="font-mono text-[11px] text-slate-900 dark:text-white break-all text-right">{selectedReceipt.merchant_reference}</span>
              </div>
              {selectedReceipt.chapa_reference && (
                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0 pr-2">{t('wallet.chapa_ref')}</span>
                  <span className="font-mono text-[11px] text-slate-900 dark:text-white break-all text-right">{selectedReceipt.chapa_reference}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">{t('wallet.gateway_method')}</span>
                <span className="font-medium text-slate-900 dark:text-white">{selectedReceipt.payment_method}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 italic text-center mb-6">
              {t('wallet.receipt_note')}
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {selectedTxId && (
                <button
                  type="button"
                  onClick={() => handleDownloadHtmlReceipt(selectedTxId)}
                  className="w-full sm:w-1/2 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors inline-flex items-center justify-center space-x-1.5"
                >
                  <Download size={14} />
                  <span>{t('wallet.download_html')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className={`w-full ${selectedTxId ? 'sm:w-1/2' : ''} py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center justify-center space-x-1.5 shadow-2xs`}
              >
                <Printer size={14} />
                <span>{t('wallet.print_receipt')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
