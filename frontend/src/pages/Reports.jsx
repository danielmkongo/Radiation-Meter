import { useState } from 'react';
import { FileText, Download, BarChart2, Shield } from 'lucide-react';
import { reportsApi, downloadBlob } from '../api/api';
import { useToast } from '../context/ToastContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Reports() {
  const toast = useToast();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cardNumber, setCardNumber] = useState('');
  const [downloading, setDownloading] = useState(null);

  async function downloadExposure() {
    setDownloading('exposure');
    try {
      const res = await reportsApi.exposureCsv({ start_date: startDate, end_date: endDate, ...(cardNumber && { card_number: cardNumber.toUpperCase() }) });
      downloadBlob(res.data, `exposure_report_${startDate}_to_${endDate}.csv`);
      toast.success('Report downloaded');
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setDownloading(null);
    }
  }

  async function downloadCompliance() {
    setDownloading('compliance');
    try {
      const res = await reportsApi.complianceCsv();
      downloadBlob(res.data, `compliance_summary_${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Compliance report downloaded');
    } catch {
      toast.error('Failed to generate compliance report');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="page-title">Reports</h2>
        <p className="text-sm text-slate-500">Export exposure data and compliance summaries</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Exposure Report */}
        <Card>
          <div className="flex items-start gap-4 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">Exposure Data Export</h3>
              <p className="text-sm text-slate-500 mt-0.5">Download all exposure log records for a date range</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Input label="Card Number (optional)" placeholder="MNH-RAD-001 — leave blank for all" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
          </div>
          <div className="mt-5 flex items-center gap-3">
            <Button variant="primary" icon={Download} loading={downloading === 'exposure'} onClick={downloadExposure}>
              Download CSV
            </Button>
            <span className="text-xs text-slate-500">Includes anomaly flags, device details, user information</span>
          </div>
        </Card>

        {/* Compliance Report */}
        <Card>
          <div className="flex items-start gap-4 mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">Compliance Summary</h3>
              <p className="text-sm text-slate-500 mt-0.5">Annual dose summary per radiologist with TAEC compliance status</p>
            </div>
          </div>
          <div className="glass-card p-4 mb-5 space-y-2">
            <p className="text-xs text-slate-400 font-medium">Report includes:</p>
            {[
              'Annual cumulative dose per radiologist',
              'Percentage of 20 mSv/year limit consumed',
              'Compliance status (Safe / Warning / Critical)',
              'Department and hospital breakdown',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-1 h-1 rounded-full bg-primary-500" />
                {item}
              </div>
            ))}
          </div>
          <Button variant="success" icon={Download} loading={downloading === 'compliance'} onClick={downloadCompliance}>
            Download Compliance CSV
          </Button>
        </Card>
      </div>

      {/* Print */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <FileText className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-100">Print Report</h3>
            <p className="text-sm text-slate-500 mt-0.5">Use your browser's print function to generate a PDF of the current page view</p>
          </div>
          <Button variant="secondary" onClick={() => window.print()}>Print Page</Button>
        </div>
      </Card>

      {/* Regulatory guidelines reference */}
      <Card title="Regulatory Reference" subtitle="TAEC / WHO / ICRP dose limits">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { period: 'Annual Limit',   value: '20 mSv/year',   note: 'Avg over 5 years',     color: 'border-primary-500/20 bg-primary-500/5' },
            { period: 'Single Year Max', value: '50 mSv/year',  note: 'Never exceed',          color: 'border-red-500/20 bg-red-500/5' },
            { period: '5-Year Total',   value: '100 mSv',       note: 'ICRP limit',            color: 'border-amber-500/20 bg-amber-500/5' },
            { period: 'Warning Level',  value: '15 mSv/year',   note: '75% of annual limit',  color: 'border-amber-500/20 bg-amber-500/5' },
          ].map((r) => (
            <div key={r.period} className={`p-3 rounded-lg border ${r.color}`}>
              <p className="text-xs text-slate-500 uppercase tracking-wide">{r.period}</p>
              <p className="text-lg font-bold text-slate-100 mt-1">{r.value}</p>
              <p className="text-xs text-slate-500">{r.note}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
