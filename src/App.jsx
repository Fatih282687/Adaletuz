import React, { useState, useEffect, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  where
} from 'firebase/firestore';
// İkon İsimleri Güncellendi
import { 
  Scale, Gavel, Calendar, Phone, Mic, Upload, CircleCheck, ChevronRight, ChevronLeft, 
  FileText, Lock, Menu, X, Clock, Shield, Send, CircleAlert, Eye, LogOut, Star, 
  Folder, CircleHelp, Zap, MessageSquarePlus, ArrowRight, Archive, Trash2, 
  TriangleAlert, ThumbsUp, Quote, LayoutDashboard, MapPin,Headphones, PenLine
} from 'lucide-react';

// --- Firebase Yapılandırması ---
const firebaseConfig = {
  apiKey: "AIzaSyBtiK4CdB7R125_tEh3NDBvZAnGqbqYGlc",
  authDomain: "adaletuz.firebaseapp.com",
  projectId: "adaletuz",
  storageBucket: "adaletuz.firebasestorage.app",
  messagingSenderId: "812720124072",
  appId: "1:812720124072:web:c0688940ae663e0aa6529d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// App ID Yönetimi (Veritabanı izolasyonu için)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'adaletuz-web';

// --- Yapay Zeka (Gemini) Yardımcısı ---
const callGemini = async (prompt) => {
  try {
    const apiKey = ""; // Sistem tarafından otomatik enjekte edilir.
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    if (!response.ok) throw new Error("API Error");
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Yanıt yok.";
  } catch (error) {
    console.error("AI Error:", error);
    return "AI servisine şu an ulaşılamıyor. Lütfen daha sonra tekrar deneyin.";
  }
};

// --- Etiket ve Çıktı Sabitleri ---
const LABEL_MAPPING = {
  tcNo: "T.C. Kimlik No",
  birthDate: "Doğum Tarihi",
  education: "Eğitim Durumu",
  address: "Açık Adres",
  employer: "İşveren Ünvanı",
  taxId: "Vergi Numarası",
  workAddress: "İşyeri Adresi",
  workerCount: "Çalışan Sayısı",
  contractType: "Çalışma Şekli", 
  union: "Sendika / Toplu İş Sözleşmesi", 
  jobDesc: "İş Tanımı",
  startDate: "İşe Giriş Tarihi",
  endDate: "İşten Çıkış Tarihi",
  workSchedule: "Çalışma Saatleri ve Düzeni", 
  attendanceSystem: "Giriş-Çıkış Takip Sistemi", 
  salary: "Son Net Ücret",
  raises: "Ücret Artışları", 
  paymentTime: "Ödeme Zamanı",
  paymentMethod: "Ödeme Yöntemi",
  receivables: "Alacaklar (Maaş/Mesai/Bayram)", 
  bonuses: "Yan Haklar & Sosyal Haklar",
  payrollStatus: "Bordro Durumu", 
  foodTransport: "Yol ve Yemek", 
  annualLeave: "Kalan Yıllık İzin",
  noticePeriod: "İhbar Öneli",
  jobSearchLeave: "İş Arama İzni",
  witnesses: "Tanıklar",
  releaseForm: "İbraname/İstifa Belgesi",
  subcontractor: "Alt İşveren/Devir",
  sgkCode: "SGK Çıkış Kodu",
  healthStatus: "Sağlık Durumu", 
  specialIssues: "Özel Hususlar (Mobbing vb.)",
  terminationReason: "Fesih Nedeni",
  ongoingTermination: "İş Akdi Devam Durumu" 
};

// --- Export Yardımcıları ---
const formatDataForExport = (data, type) => {
  const dateStr = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : new Date().toLocaleString();
  let contentHtml = "";

  if (type === 'cases') {
    contentHtml += `
      <h3>Müvekkil Bilgileri</h3>
      <p><strong>Ad Soyad:</strong> ${data.clientInfo?.name || '-'}</p>
      <p><strong>Telefon:</strong> ${data.clientInfo?.phone || '-'}</p>
      <p><strong>E-posta:</strong> ${data.clientInfo?.email || '-'}</p>
      <p><strong>T.C. No:</strong> ${data.answers?.tcNo?.text || '-'}</p>
      <p><strong>Doğum Tarihi:</strong> ${data.answers?.birthDate?.text || '-'}</p>
      <p><strong>Adres:</strong> ${data.answers?.address || '-'}</p>
      <hr/>
      <h3>Dava Detayları</h3>
    `;
    Object.entries(data.answers || {}).forEach(([key, val]) => {
      if(['tcNo', 'birthDate', 'address', 'education'].includes(key)) return;
      const label = LABEL_MAPPING[key] || key;
      const valueText = typeof val === 'object' ? (val.text || 'Sesli yanıt verildi.') : val;
      contentHtml += `<p><strong>${label}:</strong><br/>${valueText}</p>`;
    });
  } else if (type === 'questions') {
    contentHtml += `
      <h3>Kişi Bilgileri</h3>
      <p><strong>Ad Soyad:</strong> ${data.name || '-'}</p>
      <p><strong>Telefon:</strong> ${data.phone || '-'}</p>
      <p><strong>E-posta:</strong> ${data.email || '-'}</p>
      <hr/>
      <h3>Soru Detayı</h3>
      <p>${data.question}</p>
    `;
  }

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h1 style="color: #2c3e50; border-bottom: 2px solid #e67e22; padding-bottom: 10px;">Uzman Hukuk - ${type === 'cases' ? 'İş Davası Dosyası' : 'Danışmanlık Talebi'}</h1>
      <p style="font-size: 12px; color: #7f8c8d;">Oluşturulma Tarihi: ${dateStr}</p>
      <br/>
      ${contentHtml}
      <br/>
      <hr/>
      <p style="font-size: 10px; text-align: center; color: #95a5a6;">Bu belge Uzman Hukuk platformu üzerinden oluşturulmuştur.</p>
    </div>
  `;
};

const handleExportWord = (data, type) => {
  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Uzman Hukuk Dosyası</title></head>
    <body>${formatDataForExport(data, type)}</body>
    </html>
  `;
  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `uzman-hukuk-${type}-${data.id}.doc`; 
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const handlePrintPDF = (data, type) => {
  const content = formatDataForExport(data, type);
  const printWindow = window.open('', '', 'height=600,width=800');
  printWindow.document.write('<html><head><title>Yazdır</title>');
  printWindow.document.write('</head><body >');
  printWindow.document.write(content);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.print();
};
const HakkimizdaView = ({ onNavigate }) => {
  return (
    <div className="animate-fadeIn">
      <section className="relative h-[350px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=2070" 
            alt="Adalet ve Hukuk" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900"></div>
        </div>
        <div className="relative z-10 text-center px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Hakkımızda</h1>
          <div className="h-1 w-20 bg-amber-500 mx-auto rounded-full"></div>
        </div>
      </section>
      <section className="py-16 px-6 max-w-4xl mx-auto">
        <div className="bg-slate-800/40 border border-slate-700/50 p-8 md:p-12 rounded-3xl backdrop-blur-sm shadow-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-amber-500 mb-8 leading-tight">Güvenle Geleceğe, Uzmanlıkla Çözüme</h2>
          <div className="space-y-6 text-slate-300 leading-relaxed text-base md:text-lg">
            <p>Uzman Hukuk & Danışmanlık olarak, hukukun sadece kurallar bütünü değil, hak ve özgürlüklerin en güçlü kalesi olduğuna inanıyoruz.</p>
            <div className="grid md:grid-cols-3 gap-6 my-12">
              <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-700/50 text-center">
                <Scale className="text-amber-500 mx-auto mb-3" size={28} />
                <h3 className="text-white font-bold mb-1 italic">İş Hukuku</h3>
              </div>
              <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-700/50 text-center">
                <Gavel className="text-amber-500 mx-auto mb-3" size={28} />
                <h3 className="text-white font-bold mb-1 italic">İcra İflas</h3>
              </div>
              <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-700/50 text-center">
                <Shield className="text-amber-500 mx-auto mb-3" size={28} />
                <h3 className="text-white font-bold mb-1 italic">Gayrimenkul</h3>
              </div>
            </div>
          </div>
          <div className="mt-12 text-center border-t border-slate-700 pt-8">
             <Button onClick={() => onNavigate('home')} variant="outline" className="px-10">Anasayfaya Dön</Button>
          </div>
        </div>
      </section>
    </div>
  );
};
const HomeView = ({ onNavigate }) => {
  return (
    <div className="container mx-auto py-20 text-center">
      <h1 className="text-5xl font-bold mb-6">Uzman Hukuk'a Hoş Geldiniz</h1>
      <p className="text-xl text-slate-400 mb-10">Hukuki süreçlerinizde profesyonel çözüm ortağınız.</p>
      <div className="flex justify-center gap-4">
        <Button onClick={() => onNavigate('soru-sor')}>Soru Sor</Button>
        <Button variant="outline" onClick={() => onNavigate('hakkimizda')}>Hakkımızda</Button>
      </div>
    </div>
  );
};

// --- Tasarım Sabitleri ---
const THEME = {
  bg: "bg-slate-900",
  bgPaper: "bg-slate-800",
  text: "text-slate-100",
  input: "bg-slate-900 border-slate-700 focus:border-amber-500 text-white placeholder-slate-500",
  accent: "text-amber-500",
  accentBg: "bg-amber-600 hover:bg-amber-700"
};

// --- Yardımcı Bileşenler ---

const InfoTooltip = ({ text }) => (
  <div className="group relative inline-flex ml-2 align-middle z-50">
    <CircleHelp size={16} className="text-amber-500/80 hover:text-amber-400 cursor-help transition-colors" />
    <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute w-64 p-3 text-xs font-light text-slate-200 bg-slate-800 border border-amber-500/30 rounded-lg shadow-xl -left-28 bottom-full mb-2 pointer-events-none z-[100]">
      {text}
      <div className="absolute left-1/2 -bottom-1 w-2 h-2 bg-slate-800 border-r border-b border-amber-500/30 -translate-x-1/2 rotate-45"></div>
    </div>
  </div>
);

const Button = ({ children, variant = "primary", onClick, className = "", disabled = false, type="button", title="" }) => {
  const base = "px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary: `${THEME.accentBg} text-white shadow-lg shadow-amber-900/20`,
    secondary: "bg-slate-700 text-white hover:bg-slate-600",
    outline: "border border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500",
    danger: "bg-red-600 text-white hover:bg-red-700"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`} title={title}>
      {children}
    </button>
  );
};

const Input = ({ label, required, info, ...props }) => (
  <div className="mb-4">
    <label className="flex items-center text-sm font-medium text-slate-300 mb-1.5">{label} {required && <span className="text-amber-500 ml-1">*</span>} {info && <InfoTooltip text={info} />}</label>
    <input className={`w-full px-4 py-2.5 rounded-lg border focus:ring-1 focus:ring-amber-500 outline-none transition-colors ${THEME.input}`} {...props} />
  </div>
);

const TextAreaInput = ({ label, required, info, ...props }) => (
  <div className="mb-4">
    <label className="flex items-center text-sm font-medium text-slate-300 mb-1.5">{label} {required && <span className="text-amber-500 ml-1">*</span>} {info && <InfoTooltip text={info} />}</label>
    <textarea rows={3} className={`w-full px-4 py-2.5 rounded-lg border focus:ring-1 focus:ring-amber-500 outline-none transition-colors resize-none ${THEME.input}`} {...props} />
  </div>
);

const AudioRecorder = ({ onRecordingComplete, label = "Ses Kaydı" }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (e) => { if(e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => onRecordingComplete(reader.result);
        chunksRef.current = [];
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) { alert("Mikrofon hatası: " + err.message); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  return (
    <div className="flex items-center gap-3 mt-2">
      {!isRecording && !audioURL && (
        <button type="button" onClick={startRecording} className="flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400 bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
          <Mic size={18} /> {label}
        </button>
      )}
      {isRecording && (
        <button type="button" onClick={stopRecording} className="flex items-center gap-2 text-sm text-red-400 animate-pulse bg-red-500/10 px-3 py-2 rounded-lg border border-red-500">
          <X size={18} /> Kaydı Bitir
        </button>
      )}
      {audioURL && (
        <div className="flex items-center gap-3 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
          <audio src={audioURL} controls className="h-8 w-48" />
          <button type="button" onClick={() => { setAudioURL(null); onRecordingComplete(null); }} className="text-slate-400 hover:text-red-400"><X size={16}/></button>
        </div>
      )}
    </div>
  );
};

const FileUpload = ({ onFileSelect }) => {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1048576) return alert("Dosya 1MB'dan küçük olmalı.");
      setFileName(file.name);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => onFileSelect({ name: file.name, data: reader.result, type: file.type });
    }
  };
  return (
    <div className="mt-2">
      <input type="file" ref={fileInputRef} onChange={handleFile} className="hidden" accept=".pdf,.doc,.docx,.jpg" />
      <button type="button" onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
        <Upload size={16} /> {fileName || "Dosya Ekle"}
      </button>
      <span className="text-[10px] text-amber-500/80 ml-2 block mt-1">Dikkat: 1 MB üstü dosya yüklemeyiniz.</span>
    </div>
  );
};

const HybridInput = ({ label, value, onChange, onAudio, onFile, showFile=false, required=false, info, rows=3 }) => (
  <div className="mb-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
    <label className="flex items-center text-sm font-medium text-slate-300 mb-2">{label} {required && <span className="text-amber-500 ml-1">*</span>}{info && <InfoTooltip text={info} />}</label>
    <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} className={`w-full px-4 py-3 rounded-lg resize-none ${THEME.input}`} placeholder="Yazın veya konuşun..." />
    <div className="flex flex-wrap justify-between mt-2 gap-2">
      <AudioRecorder onRecordingComplete={onAudio} />
      {showFile && <FileUpload onFileSelect={onFile} />}
    </div>
  </div>
);

const KvkkModal = ({ onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[80vh] rounded-2xl flex flex-col shadow-2xl animate-fadeIn">
      <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800 rounded-t-2xl">
        <h3 className="text-xl font-bold text-white flex items-center gap-2"><FileText className="text-amber-500" size={20}/> KVKK ve Gizlilik Politikası</h3>
        <button onClick={onClose}><X className="text-slate-400 hover:text-white" /></button>
      </div>
      <div className="p-8 overflow-y-auto text-slate-300 text-sm leading-relaxed space-y-6">
        <h4 className="text-lg font-bold text-white">1. Veri Sorumlusu</h4>
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca, kişisel verileriniz; veri sorumlusu olarak <strong>Uzman Hukuk</strong> tarafından aşağıda açıklanan kapsamda işlenebilecektir.
        </p>

        <h4 className="text-lg font-bold text-white">2. Kişisel Verilerin Hangi Amaçla İşleneceği</h4>
        <p>
          Toplanan kişisel verileriniz; hukuk danışmanlığı süreçlerinin yürütülmesi, iş davası ve tazminat hesaplamalarının yapılabilmesi, tarafınızla iletişime geçilmesi, randevu taleplerinin organize edilmesi ve hukuki değerlendirme süreçlerinin tamamlanması amaçlarıyla işlenmektedir.
        </p>
        
        <h4 className="text-lg font-bold text-white">3. İşlenen Kişisel Veriler</h4>
        <p>
          Sistemimiz üzerinden bizimle paylaştığınız Ad, Soyad, Telefon, E-posta, T.C. Kimlik Numarası (dava dosyası oluşturulması halinde), Çalışma Bilgileri, Maaş Bilgileri ve sağlık/özel durumunuza ilişkin paylaştığınız veriler KVKK’ya uygun olarak sistemlerimizde güvenle saklanmaktadır.
        </p>

        <h4 className="text-lg font-bold text-white">4. İşlenen Verilerin Kimlere ve Hangi Amaçla Aktarılabileceği</h4>
        <p>
          Kişisel verileriniz, kanunen yetkili kamu kurumları (Mahkemeler, SGK vb.) dışında hiçbir üçüncü kişi veya kurumla paylaşılmamaktadır. Verileriniz sadece avukat-müvekkil gizliliği çerçevesinde hukuk büromuz bünyesindeki yetkili avukatlar ve danışmanlar tarafından görülmektedir.
        </p>

        <h4 className="text-lg font-bold text-white">5. Veri Güvenliği</h4>
        <p>
          Uzman Hukuk, kişisel verilerinizных hukuka aykırı olarak işlenmesini ve erişilmesini önlemek amacıyla gerekli her türlü teknik ve idari güvenlik tedbirlerini almaktadır.
        </p>

        <div className="pt-4 border-t border-slate-700"><p className="text-xs text-slate-500">Bu metin en son 29.12.2025 tarihinde güncellenmiştir.</p></div>
      </div>
      <div className="p-6 border-t border-slate-700 bg-slate-800 rounded-b-2xl flex justify-end"><Button onClick={onClose}>Okudum, Anladım ve Onaylıyorum</Button></div>
    </div>
  </div>
);

// --- Sayfa Bileşenleri ---

const HakkimizdaView = ({ onNavigate }) => {
  
  return (
    <div className="animate-fadeIn">
      {/* Üst Header / Görsel Bölümü */}
      <section className="relative h-[350px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=2070" 
            alt="Adalet ve Hukuk" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900"></div>
        </div>
        <div className="relative z-10 text-center px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Hakkımızda</h1>
          <div className="h-1 w-20 bg-amber-500 mx-auto rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
        </div>
      </section>

      {/* İçerik Bölümü */}
      <section className="py-16 px-6 max-w-4xl mx-auto">
        <div className="bg-slate-800/40 border border-slate-700/50 p-8 md:p-12 rounded-3xl backdrop-blur-sm shadow-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-amber-500 mb-8 leading-tight">
            Güvenle Geleceğe, Uzmanlıkla Çözüme
          </h2>
          
          <div className="space-y-6 text-slate-300 leading-relaxed text-base md:text-lg">
            <p>
              Uzman Hukuk & Danışmanlık olarak, hukukun sadece kurallar bütünü değil, hak ve özgürlüklerin en güçlü kalesi olduğuna inanıyoruz. Değişen dünyanın getirdiği yeni nesil ihtiyaçları, köklü hukuk disipliniyle harmanlayarak müvekkillerimize dinamik çözümler sunuyoruz.
            </p>

            {/* İkonlu Uzmanlık Alanları */}
            <div className="grid md:grid-cols-3 gap-6 my-12">
              <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-700/50 transition-transform hover:-translate-y-1">
                <Scale className="text-amber-500 mb-3" size={28} />
                <h3 className="text-white font-bold mb-1 italic">İş Hukuku</h3>
                <p className="text-xs text-slate-500">Çalışma hayatındaki haklarınızın güvencesi.</p>
              </div>
              <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-700/50 transition-transform hover:-translate-y-1">
                <Gavel className="text-amber-500 mb-3" size={28} />
                <h3 className="text-white font-bold mb-1 italic">İcra İflas</h3>
                <p className="text-xs text-slate-500">Alacak takibi ve finansal süreçler.</p>
              </div>
              <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-700/50 transition-transform hover:-translate-y-1">
                <Shield className="text-amber-500 mb-3" size={28} />
                <h3 className="text-white font-bold mb-1 italic">Gayrimenkul</h3>
                <p className="text-xs text-slate-500">Mülkiyet ve taşınmaz uzmanlığı.</p>
              </div>
            </div>

            <p>
              Hizmetlerimizde şeffaflık, mutlak gizlilik ve ulaşılabilirlik temel önceliklerimizdir. Kurumsal danışmanlık başta olmak üzere geniş bir yelpazede, her hukuki süreci büyük bir titizlikle yönetiyoruz. 
            </p>

            <blockquote className="italic border-l-4 border-amber-500 pl-6 py-4 bg-amber-500/5 rounded-r-2xl text-slate-200">
              "Bizim için her hukuki süreç sadece bir işlem değil, karşılıklı güvene dayalı bir yol arkadaşlığıdır. Bu bilinçle, ihtiyaçlarınızı en ince ayrıntısına kadar analiz ediyor, sizi dikkatle dinliyor ve menfaatlerinizi korumak için kararlılıkla çalışıyoruz."
            </blockquote>

            <p>
              Gebze merkezli ofisimizden tüm Türkiye’ye uzanan bir güven köprüsü kurarak, hukuki güvenliğinizi sağlamak için buradayız.
            </p>
          </div>

          <div className="mt-12 text-center border-t border-slate-700 pt-8">
             <Button onClick={() => onNavigate('home')} variant="outline" className="px-10">Anasayfaya Dön</Button>
          </div>
        </div>
      </section>
    </div>
  );
};

const GeneralQuestionForm = ({ db, appId }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', question: '' });
  const [audio, setAudio] = useState(null);
  const [file, setFile] = useState(null);
  const [kvkk, setKvkk] = useState(false);
  const [showKvkkModal, setShowKvkkModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert("Lütfen Ad Soyad giriniz.");
    if (!kvkk) return alert("Lütfen KVKK metnini onaylayın.");
    setLoading(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'general_questions'), {
        ...formData, audioData: audio, fileData: file, createdAt: serverTimestamp(), status: 'new'
      });
      alert("Genel sorunuz alındı! En kısa sürede dönüş yapacağız.");
      setFormData({ name: '', email: '', phone: '', question: '' });
    } catch (error) { console.error(error); alert("Bir hata oluştu."); } finally { setLoading(false); }
  };

  return (
    <>
      {showKvkkModal && <KvkkModal onClose={() => setShowKvkkModal(false)} />}
      <div className="max-w-2xl mx-auto py-12 px-6">
        <h2 className="text-3xl font-bold text-white mb-2">Genel Hukuki Danışmanlık</h2>
        <p className="text-slate-400 mb-8">Her türlü hukuki sorununuz için bize yazabilirsiniz.</p>
        <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-2xl border border-slate-700">
          <div className="grid md:grid-cols-2 gap-4"><Input label="Ad Soyad" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /><Input label="E-posta" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
          <Input label="Telefon" required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          <div className="mb-6"><label className="block text-sm font-medium text-slate-300 mb-2">Sorunuzu Detaylandırın</label><textarea required className={`w-full px-4 py-3 rounded-lg border h-32 resize-none focus:ring-1 focus:ring-amber-500 outline-none transition-colors ${THEME.input}`} value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} placeholder="Sorunuzu buraya yazın veya ses kaydedin..." /><div className="flex gap-4 mt-2"><AudioRecorder onRecordingComplete={setAudio} /><FileUpload onFileSelect={setFile} /></div></div>
          <div className="flex items-start gap-3 mb-8"><input type="checkbox" id="kvkk" checked={kvkk} onChange={e => setKvkk(e.target.checked)} className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500" /><label htmlFor="kvkk" className="text-sm text-slate-400">Kişisel verilerimin işlenmesine ilişkin <span onClick={() => setShowKvkkModal(true)} className="text-amber-500 underline cursor-pointer hover:text-amber-400">Aydınlatma Metni</span>'ni okudum ve onaylıyorum.</label></div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Gönderiliyor..." : "Gönder"} <Send size={18} /></Button>
        </form>
      </div>
    </>
  );
};

const WizardForm = ({ db, appId, onSwitchToGeneral }) => {
  const [step, setStep] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [kvkk, setKvkk] = useState(false);
  const [showKvkkModal, setShowKvkkModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', answers: {}, files: [] });

  const startDetailedWizard = () => setStep(1);

  const updateAnswer = (key, text) => setFormData(prev => ({...prev, answers: { ...prev.answers, [key]: { ...prev.answers[key], text } }}));
  const updateAudio = (key, audioData) => setFormData(prev => ({...prev, answers: { ...prev.answers, [key]: { ...prev.answers[key], audio: audioData } }}));
  const handleStepNext = () => { if (step === 1 && !formData.name) { alert("Lütfen Ad Soyad giriniz."); return; } setStep(prev => prev + 1); };
  const handleStepPrev = () => setStep(prev => prev - 1);

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !kvkk) return alert("Zorunlu alanları ve KVKK onayını kontrol ediniz.");
    setLoading(true);
    try {
       await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'labor_cases'), {
        clientInfo: { name: formData.name, email: formData.email, phone: formData.phone },
        answers: formData.answers, files: formData.files, createdAt: serverTimestamp(), status: 'new'
      });
      alert("İş davası başvurunuz başarıyla alındı! Uzmanlarımız inceleyip dönecektir.");
      setStep(0);
    } catch (err) { alert("Hata oluştu."); } finally { setLoading(false); }
  };

  if (step === 0) return (
      <div className="max-w-6xl mx-auto py-12 px-6">
          <h2 className="text-3xl font-bold text-white text-center mb-8">Nasıl Yardımcı Olabiliriz?</h2>
          <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 flex flex-col items-center text-center hover:border-amber-500/50 transition-colors">
                  <div className="p-4 bg-blue-500/10 rounded-full text-blue-400 mb-6"><Zap size={32}/></div>
                  <h3 className="text-2xl font-bold text-white mb-2">Genel Hukuki Danışmanlık</h3>
                  <p className="text-slate-400 mb-8">Boşanma, Ceza, Miras, Gayrimenkul veya diğer tüm hukuki konularda genel sorularınız için.</p>
                  <Button onClick={onSwitchToGeneral} variant="secondary" className="w-full mt-auto">Genel Soru Sor <ChevronRight size={16}/></Button>
              </div>
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-2xl border border-amber-500/30 relative overflow-hidden flex flex-col items-center text-center">
                  <div className="p-4 bg-amber-500/10 rounded-full text-amber-500 mb-6 relative z-10"><FileText size={32}/></div>
                  <h3 className="text-2xl font-bold text-white mb-2 relative z-10">İş Hukuku / Tazminat Hesapla</h3>
                  <p className="text-slate-400 mb-8 relative z-10">Kıdem, İhbar, Fazla Mesai ve İşe İade davalarınız için detaylı analiz ve tazminat hesaplama sihirbazı.</p>
                  <Button onClick={startDetailedWizard} className="w-full mt-auto relative z-10">Sihirbazı Başlat <ArrowRight size={16}/></Button>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl"></div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      {showKvkkModal && <KvkkModal onClose={() => setShowKvkkModal(false)} />}
      
      {step === 1 && (
        <div className="bg-slate-800/80 border border-blue-500/30 p-6 rounded-xl mb-8 animate-fadeIn">
            <h3 className="text-lg font-bold text-blue-400 mb-2 flex items-center gap-2"><CircleAlert size={20}/> ÖNEMLİ BİLGİLENDİRME</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
                Değerli Müvekkil Adayımız;<br/><br/>
                İş davası ve tazminat hesaplama sürecinde, vereceğiniz cevapların doğruluğu ve detayı, hak kaybına uğramamanız için hayati önem taşımaktadır. 
                Lütfen soruları acele etmeden, elinizdeki belgelere (Bordro, SGK Dökümü, Sözleşme) bakarak cevaplayınız. 
                Emin olmadığınız konularda yaklaşık bilgi verebilir veya sesli not bırakabilirsiniz. 
                Burada gireceğiniz veriler KVKK kapsamında korunmakta olup, sadece avukatlarımız tarafından incelenecektir.
            </p>
        </div>
      )}

      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg mb-8 flex gap-3"><CircleAlert className="text-amber-500 shrink-0 mt-1" size={20} /><p className="text-sm text-amber-200/80">Lütfen 7 adımlı iş hukuku bilgi toplama sürecini tamamlayınız.</p></div>
      <div className="mb-8 flex justify-between items-center text-sm text-slate-500 font-mono"><span>ADIM {step}/7</span><div className="h-1 flex-1 mx-4 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${(step/7)*100}%` }}></div></div></div>
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 min-h-[400px] relative">
         
         {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
                <h3 className="text-xl font-bold text-white mb-4">1. Müvekkil Bilgileri</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Ad Soyad" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <Input label="T.C. Kimlik No" info="Dava dosyası hazırlığı için gereklidir." value={formData.answers.tcNo?.text || ''} onChange={e => updateAnswer('tcNo', e.target.value)} />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Doğum Tarihi" type="date" value={formData.answers.birthDate?.text || ''} onChange={e => updateAnswer('birthDate', e.target.value)} />
                    <Input label="Eğitim Durumu" value={formData.answers.education?.text || ''} onChange={e => updateAnswer('education', e.target.value)} />
                </div>
                <TextAreaInput label="Açık Adres" info="Tebligat adresi olarak kullanılacaktır." value={formData.answers.address || ''} onChange={e => updateAnswer('address', e.target.value)} />
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Telefon Numarası" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    <Input label="E-posta Adresi" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
            </div>
         )}

         {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
                <h3 className="text-xl font-bold text-white mb-4">2. İşveren Bilgileri</h3>
                <Input label="İşveren Ünvanı" info="Maaş bordronuzda yazan tam şirket adı." value={formData.answers.employer?.text || ''} onChange={e => updateAnswer('employer', e.target.value)} />
                <Input label="Vergi Numarası" info="Biliyorsanız süreci hızlandırır." value={formData.answers.taxId?.text || ''} onChange={e => updateAnswer('taxId', e.target.value)} />
                <TextAreaInput label="İşyerinin Açık Adresi" info="Davanın açılacağı mahkemeyi belirler." value={formData.answers.workAddress?.text || ''} onChange={e => updateAnswer('workAddress', e.target.value)} />
                <Input label="Yaklaşık Çalışan Sayısı" info="İşe iade davası şartları için önemlidir (30 kişi sınırı)." value={formData.answers.workerCount?.text || ''} onChange={e => updateAnswer('workerCount', e.target.value)} />
                <HybridInput label="Çalışma Şekli" info="Tam zamanlı, part-time veya proje bazlı mı?" value={formData.answers.contractType?.text} onChange={t => updateAnswer('contractType', t)} onAudio={a => updateAudio('contractType', a)} />
                <Input label="Sendika / Toplu İş Sözleşmesi" info="Sendikalı iseniz tazminat haklarınız değişebilir." value={formData.answers.union?.text || ''} onChange={e => updateAnswer('union', e.target.value)} />
            </div>
         )}

         {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
                <h3 className="text-xl font-bold text-white mb-4">3. İşe İlişkin Bilgiler</h3>
                <HybridInput label="İş Tanımı" info="SGK kodunuz ile yaptığınız iş uyuşuyor mu? Kısaca anlatın." value={formData.answers.jobDesc?.text} onChange={t => updateAnswer('jobDesc', t)} onAudio={a => updateAudio('jobDesc', a)} />
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="İşe Giriş Tarihi" type="date" value={formData.answers.startDate?.text || ''} onChange={e => updateAnswer('startDate', e.target.value)} />
                    <Input label="İşten Çıkış Tarihi" type="date" value={formData.answers.endDate?.text || ''} onChange={e => updateAnswer('endDate', e.target.value)} />
                </div>
                <HybridInput label="Çalışma Saatleri ve Düzeni" info="Örn: 08:00-18:00, haftada 6 gün. Molalar dahil mi?" value={formData.answers.workSchedule?.text} onChange={t => updateAnswer('workSchedule', t)} onAudio={a => updateAudio('workSchedule', a)} />
                <HybridInput label="Giriş-Çıkış Takip Sistemi" info="Parmak izi, kart, yüz tanıma veya imza föyü kullanılıyor mu?" value={formData.answers.attendanceSystem?.text} onChange={t => updateAnswer('attendanceSystem', t)} onAudio={a => updateAudio('attendanceSystem', a)} />
            </div>
         )}

         {step === 4 && (
            <div className="space-y-4 animate-fadeIn">
                <h3 className="text-xl font-bold text-white mb-4">4. Ödemeler ve Sosyal Haklar</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Son Aldığınız Net Ücret" info="Banka hesabınıza yatan net tutar." value={formData.answers.salary?.text || ''} onChange={e => updateAnswer('salary', e.target.value)} />
                    <Input label="Ücret Ödeme Zamanı" info="Her ayın kaçında ödeme alıyordunuz?" value={formData.answers.paymentTime?.text || ''} onChange={e => updateAnswer('paymentTime', e.target.value)} />
                </div>
                <HybridInput label="Ücret Artışları (Dönem ve Oran)" info="Yılda bir mi, altı ayda bir mi zam yapılıyordu?" value={formData.answers.raises?.text} onChange={t => updateAnswer('raises', t)} onAudio={a => updateAudio('raises', a)} />
                <Input label="Ödeme Yöntemi (Banka/Elden)" info="Maaşın bir kısmı elden veriliyor muydu? Bu çok önemlidir." value={formData.answers.paymentMethod?.text || ''} onChange={e => updateAnswer('paymentMethod', e.target.value)} />
                <HybridInput label="Alacaklar (Maaş, Mesai, Bayram)" info="Ödenmeyen fazla mesai veya resmi tatil çalışması var mı?" value={formData.answers.receivables?.text} onChange={t => updateAnswer('receivables', t)} onAudio={a => updateAudio('receivables', a)} />
                <HybridInput label="Yan Haklar & Sosyal Haklar" info="Prim, ikramiye, yakacak yardımı vb." value={formData.answers.bonuses?.text} onChange={t => updateAnswer('bonuses', t)} onAudio={a => updateAudio('bonuses', a)} />
                <HybridInput label="Bordro Durumu" info="Bordroları imzalıyor muydunuz? Gerçek maaşınızla bordro tutuyor muydu?" value={formData.answers.payrollStatus?.text} onChange={t => updateAnswer('payrollStatus', t)} onAudio={a => updateAudio('payrollStatus', a)} />
                <HybridInput label="Yol ve Yemek" info="Servis var mı? Yemek kartı mı veriliyor?" value={formData.answers.foodTransport?.text} onChange={t => updateAnswer('foodTransport', t)} onAudio={a => updateAudio('foodTransport', a)} />
                <Input label="Kalan Yıllık İzin" value={formData.answers.annualLeave?.text || ''} onChange={e => updateAnswer('annualLeave', e.target.value)} />
                
                <div className="mt-4 border-t border-slate-700 pt-4">
                    <p className="text-sm text-slate-400 mb-2">Maaş Bordrosu veya Banka Dekontu Yükle:</p>
                    <div className="flex gap-2 flex-wrap">
                        <FileUpload onFileSelect={(f) => setFormData(p => ({...p, files: [...p.files, f]}))} />
                    </div>
                </div>
            </div>
         )}

         {step === 5 && (
            <div className="space-y-4 animate-fadeIn">
                <h3 className="text-xl font-bold text-white mb-4">5. Fesih – Belgeler</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="İhbar Öneli Kullandırıldı Mı?" info="İşten çıkarılmadan önce size süre verildi mi?" value={formData.answers.noticePeriod?.text || ''} onChange={e => updateAnswer('noticePeriod', e.target.value)} />
                    <Input label="İş Arama İzni Verildi Mi?" info="Günde 2 saat iş arama izni kullandınız mı?" value={formData.answers.jobSearchLeave?.text || ''} onChange={e => updateAnswer('jobSearchLeave', e.target.value)} />
                </div>
                <HybridInput label="Tanık İsim ve Adresleri" info="Sizinle birlikte çalışan ve şartları bilen 2 şahit." rows={5} value={formData.answers.witnesses?.text} onChange={t => updateAnswer('witnesses', t)} onAudio={a => updateAudio('witnesses', a)} />
                <HybridInput label="İbraname veya İstifa Belgesi" info="Herhangi bir belgeye imza attınız mı? Zorla mı imzalatıldı?" value={formData.answers.releaseForm?.text} onChange={t => updateAnswer('releaseForm', t)} onAudio={a => updateAudio('releaseForm', a)} />
                <HybridInput label="Alt İşveren / Özel Durumlar" info="Şirket devri veya taşeronluk durumu var mı?" value={formData.answers.subcontractor?.text} onChange={t => updateAnswer('subcontractor', t)} onAudio={a => updateAudio('subcontractor', a)} />
                <Input label="SGK Çıkış Kodu" info="E-Devlet'ten veya çıkış belgesinden kodu öğrenebilirsiniz (Örn: Kod 04, Kod 29)." value={formData.answers.sgkCode?.text || ''} onChange={e => updateAnswer('sgkCode', e.target.value)} />
                
                <div className="mt-4 border-t border-slate-700 pt-4">
                    <p className="text-sm text-slate-400 mb-2">Fesih Bildirimi veya İbraname Örneği Yükle:</p>
                    <div className="flex gap-2 flex-wrap">
                        <FileUpload onFileSelect={(f) => setFormData(p => ({...p, files: [...p.files, f]}))} />
                        {formData.files.map((f, i) => (<span key={i} className="text-xs bg-slate-700 px-2 py-1 rounded text-emerald-400 flex items-center gap-1"><FileText size={10} /> {f.name}</span>))}
                    </div>
                </div>
            </div>
         )}

         {step === 6 && (
            <div className="space-y-4 animate-fadeIn">
                <h3 className="text-xl font-bold text-white mb-4">6. Sağlık & Özel Hususlar</h3>
                <HybridInput label="Sağlık Durumu ve Raporlar" info="Meslek hastalığı veya iş kazası geçirdiniz mi?" rows={4} value={formData.answers.healthStatus?.text} onChange={t => updateAnswer('healthStatus', t)} onAudio={a => updateAudio('healthStatus', a)} />
                <HybridInput label="Özel Hususlar (Mobbing vb.)" info="İşyerinde baskı, hakaret veya ayrımcılığa maruz kaldınız mı?" rows={4} value={formData.answers.specialIssues?.text} onChange={t => updateAnswer('specialIssues', t)} onAudio={a => updateAudio('specialIssues', a)} />
                
                <div className="mt-4 border-t border-slate-700 pt-4">
                    <p className="text-sm text-slate-400 mb-2">Varsa Doktor Raporu veya Delil Yükle:</p>
                    <div className="flex gap-2 flex-wrap">
                          <FileUpload onFileSelect={(f) => setFormData(p => ({...p, files: [...p.files, f]}))} />
                    </div>
                </div>
            </div>
         )}

         {step === 7 && (
            <div className="space-y-4 animate-fadeIn">
                <h3 className="text-xl font-bold text-white mb-4">7. Sonuç ve Onay</h3>
                <HybridInput label="İş Akdiniz Devam Ediyor Mu?" value={formData.answers.ongoingTermination?.text} onChange={t => updateAnswer('ongoingTermination', t)} onAudio={a => updateAudio('ongoingTermination', a)} />
                <HybridInput label="İş akdinin sona erdirilme sebebi?" info="Size söylenen sebep ile gerçek sebep farklı olabilir." value={formData.answers.terminationReason?.text} onChange={t => updateAnswer('terminationReason', t)} onAudio={a => updateAudio('terminationReason', a)} required={true} />
                
                <div className="flex items-start gap-3 mt-6 border-t border-slate-700 pt-4">
                    <input type="checkbox" id="kvkk_wizard" checked={kvkk} onChange={e => setKvkk(e.target.checked)} className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500" />
                    <label htmlFor="kvkk_wizard" className="text-sm text-slate-400"><span onClick={() => setShowKvkkModal(true)} className="text-amber-500 underline cursor-pointer hover:text-amber-400">KVKK Aydınlatma Metni</span>'ni okudum ve onaylıyorum.</label>
                </div>
            </div>
         )}

         <div className="flex justify-center gap-2 mt-6 mb-4">{[1, 2, 3, 4, 5, 6, 7].map(num => (<button key={num} onClick={() => setStep(num)} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${step === num ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{num}</button>))}</div>
         <div className="flex justify-between mt-8 pt-8 border-t border-slate-700">
           {step > 1 ? (<Button variant="secondary" onClick={handleStepPrev}><ChevronLeft size={16} /> Geri</Button>) : (<div />)}
           {step < 7 ? (<Button onClick={handleStepNext}>İleri <ChevronRight size={16} /></Button>) : (<Button onClick={handleSubmit} disabled={loading}>{loading ? 'Gönderiliyor...' : 'Başvuruyu Tamamla'}</Button>)}
         </div>
      </div>
    </div>
  );
};

const AppointmentForm = ({ db, appId }) => {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', date: '', notes: '' });
  const [audio, setAudio] = useState(null); 
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert("Lütfen Ad Soyad giriniz.");
    setLoading(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'appointments'), { ...formData, audioData: audio, status: 'new', createdAt: serverTimestamp() });
      alert("Randevu talebiniz alındı!");
      setFormData({ name: '', phone: '', email: '', date: '', notes: '' });
    } catch(err) { alert("Hata oluştu."); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-6">
      <h2 className="text-3xl font-bold text-white mb-2">Randevu Al</h2><p className="text-slate-400 mb-8">Size uygun bir zaman dilimini seçin.</p>
      <form onSubmit={handleSubmit} className="bg-slate-800 p-8 rounded-2xl border border-slate-700">
        <Input label="Ad Soyad" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        <div className="grid grid-cols-2 gap-4"><Input label="Telefon" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /><Input label="E-posta" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
        <Input label="Tercih Edilen Tarih/Saat" type="datetime-local" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
        <div className="mb-6"><label className="block text-sm font-medium text-slate-300 mb-1.5">Notlar</label><textarea className={`w-full px-4 py-2.5 rounded-lg border h-24 ${THEME.input}`} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /><div className="mt-3"><AudioRecorder onRecordingComplete={setAudio} label="Sesli Not Ekle" /></div></div>
        <Button type="submit" disabled={loading} className="w-full">Talep Oluştur</Button>
      </form>
    </div>
  );
};

const AdminPanel = ({ db, auth, appId, onNavigate }) => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [items, setItems] = useState([]);
  const [login, setLogin] = useState({email:'', pass:''});
  const [aiResult, setAiResult] = useState("");
  const [stats, setStats] = useState({ q: 0, c: 0, a: 0, f: 0 });

  useEffect(() => onAuthStateChanged(auth, u => { if(u && !u.isAnonymous) setUser(u); }), []);
  
  useEffect(() => {
    if(!user) return;
    const unsub1 = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'general_questions'), s => setStats(p => ({...p, q: s.docs.filter(d => d.data().status !== 'archived').length})));
    const unsub2 = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'labor_cases'), s => setStats(p => ({...p, c: s.docs.filter(d => d.data().status !== 'archived').length})));
    const unsub3 = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'appointments'), s => setStats(p => ({...p, a: s.docs.filter(d => d.data().status !== 'archived').length})));
    const unsub4 = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'feedbacks'), s => setStats(p => ({...p, f: s.docs.filter(d => d.data().status === 'new').length})));
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [user]);

  useEffect(() => {
    if(!user || view === 'dashboard') return;
    
    let collections = [];
    if (view === 'archive') {
        collections = ['general_questions', 'labor_cases', 'appointments', 'feedbacks'];
    } else if (view === 'questions') {
        collections = ['general_questions'];
    } else if (view === 'cases') {
        collections = ['labor_cases'];
    } else if (view === 'appointments') {
        collections = ['appointments'];
    } else if (view === 'feedbacks') {
        collections = ['feedbacks'];
    }

    const unsubs = collections.map(c => onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', c), s => {
      setItems(prev => {
        const others = prev.filter(i => i.source !== c);
        const news = s.docs.map(d => ({id:d.id, source:c, ...d.data()}));
        
        let filtered = [];
        if (view === 'archive') {
            filtered = news.filter(d => d.status === 'archived');
        } else {
            filtered = news.filter(d => d.status !== 'archived');
        }
        
        return [...others, ...filtered].sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
      });
    }));
    return () => { setItems([]); unsubs.forEach(u => u()); };
  }, [user, view]);

  const handleAI = async (item) => {
    setAiResult("Analiz ediliyor...");
    const content = JSON.stringify(item.answers || item.question || item.notes || item.message);
    const res = await callGemini(`Bu hukuki veriyi özetle ve öneri ver: ${content}`);
    setAiResult(res);
  };

  const handleStatus = async (item, status) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', item.source, item.id), { status });
  };

  const handleDelete = async (item) => {
    if(confirm("Bu kaydı tamamen silmek istediğinize emin misiniz?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', item.source, item.id));
    }
  };

  if(!user) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 w-96">
        <h2 className="text-xl font-bold text-white mb-4 text-center">Yönetici Girişi</h2>
        <Input label="E-posta" value={login.email} onChange={e=>setLogin({...login, email:e.target.value})}/>
        <Input label="Şifre" type="password" value={login.pass} onChange={e=>setLogin({...login, pass:e.target.value})}/>
        <Button className="w-full mb-2" onClick={() => signInWithEmailAndPassword(auth, login.email, login.pass).catch(e=>alert(e.message))}>Giriş Yap</Button>
        <button onClick={()=>onNavigate('home')} className="w-full text-slate-500 text-sm">Geri Dön</button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-900">
      <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-6">
            <h2 className="text-xl font-bold text-white">Uzman<span className="text-amber-500">Hukuk</span> Panel</h2>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button onClick={()=>setView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view==='dashboard'?'bg-amber-600 text-white':'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
            <LayoutDashboard size={18} /> Panel Özeti
          </button>
          <button onClick={()=>setView('questions')} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${view==='questions'?'bg-amber-600 text-white':'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
             <div className="flex items-center gap-3"><Gavel size={18} /> Sorular</div>
             {stats.q > 0 && <span className="bg-slate-900 text-white text-xs px-2 py-0.5 rounded-full">{stats.q}</span>}
          </button>
          <button onClick={()=>setView('cases')} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${view==='cases'?'bg-amber-600 text-white':'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
             <div className="flex items-center gap-3"><Folder size={18} /> Davalar</div>
             {stats.c > 0 && <span className="bg-slate-900 text-white text-xs px-2 py-0.5 rounded-full">{stats.c}</span>}
          </button>
          <button onClick={()=>setView('appointments')} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${view==='appointments'?'bg-amber-600 text-white':'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
             <div className="flex items-center gap-3"><Calendar size={18} /> Randevular</div>
             {stats.a > 0 && <span className="bg-slate-900 text-white text-xs px-2 py-0.5 rounded-full">{stats.a}</span>}
          </button>
          <button onClick={()=>setView('feedbacks')} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${view==='feedbacks'?'bg-amber-600 text-white':'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
             <div className="flex items-center gap-3"><MessageSquarePlus size={18} /> Geri Bildirim</div>
             {stats.f > 0 && <span className="bg-slate-900 text-white text-xs px-2 py-0.5 rounded-full">{stats.f}</span>}
          </button>
          <button onClick={()=>setView('archive')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view==='archive'?'bg-amber-600 text-white':'text-slate-400 hover:bg-slate-700 hover:text-white'}`}>
            <Archive size={18} /> Arşiv
          </button>
        </nav>
        <div className="p-4 border-t border-slate-700">
             <button onClick={()=>onNavigate('home')} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-700 hover:text-white rounded-lg mb-2"><ChevronLeft size={18} /> Siteye Dön</button>
             <button onClick={()=>signOut(auth)} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-700 rounded-lg"><LogOut size={18} /> Çıkış</button>
        </div>
      </div>
      
      <div className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-white mb-6 capitalize">
            {view === 'dashboard' ? 'Genel Bakış' : 
             view === 'archive' ? 'Arşivlenen Kayıtlar' : 
             view === 'feedbacks' ? 'Geri Bildirim Yönetimi' :
             view === 'questions' ? 'Gelen Sorular' :
             view === 'cases' ? 'İş Davası Başvuruları' : 'Randevu Talepleri'}
        </h1>
        
        {view === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700"><h3 className="text-slate-400 text-sm font-medium uppercase">Bekleyen Sorular</h3><p className="text-4xl font-bold text-white mt-2">{stats.q}</p></div>
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700"><h3 className="text-slate-400 text-sm font-medium uppercase">İş Davaları</h3><p className="text-4xl font-bold text-white mt-2">{stats.c}</p></div>
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700"><h3 className="text-slate-400 text-sm font-medium uppercase">Randevu Talebi</h3><p className="text-4xl font-bold text-white mt-2">{stats.a}</p></div>
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700"><h3 className="text-slate-400 text-sm font-medium uppercase">Yeni Bildirim</h3><p className="text-4xl font-bold text-white mt-2">{stats.f}</p></div>
          </div>
        )}

        {aiResult && <div className="mb-6 p-4 bg-indigo-900/30 border border-indigo-500/30 rounded text-slate-200 text-sm whitespace-pre-wrap relative"><button onClick={()=>setAiResult("")} className="absolute top-2 right-2"><X size={14}/></button><strong>AI Analizi:</strong><br/>{aiResult}</div>}
        
        {view !== 'dashboard' && (
            <div className="space-y-4">
            {items.length === 0 ? <p className="text-slate-500">Kayıt bulunamadı.</p> : items.map(item => (
                <div key={item.id} className={`bg-slate-800 p-6 rounded-xl border border-slate-700 ${item.status === 'archived' ? 'opacity-70 border-slate-700/50' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                    <h3 className="font-bold text-white flex items-center gap-2">
                        {item.name || item.clientInfo?.name || "İsimsiz"} 
                        <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-amber-500 uppercase">{item.source}</span>
                        {item.status === 'archived' && <span className="bg-slate-600 text-slate-300 text-xs px-2 py-0.5 rounded-full">ARŞİV</span>}
                    </h3>
                    <p className="text-sm text-slate-400">{new Date(item.createdAt?.seconds*1000 || Date.now()).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                    {(item.source === 'labor_cases' || item.source === 'general_questions') && (
                        <>
                            <Button variant="outline" className="h-8 text-xs" onClick={()=>handleExportWord(item, item.source === 'labor_cases' ? 'cases' : 'questions')} title="Word İndir"><FileText size={12}/></Button>
                            <Button variant="outline" className="h-8 text-xs" onClick={()=>handlePrintPDF(item, item.source === 'labor_cases' ? 'cases' : 'questions')} title="PDF Yazdır"><Eye size={12}/></Button>
                        </>
                    )}
                    <Button variant="outline" className="h-8 text-xs" onClick={()=>handleAI(item)} title="Yapay Zeka Analizi"><Star size={12}/> AI</Button>
                    
                    {item.status !== 'archived' && (
                        <Button variant="outline" className="h-8 w-8 p-0 text-amber-500 border-amber-500/50 hover:bg-amber-500/10" onClick={()=>handleStatus(item, 'archived')} title="Arşivle"><Archive size={14}/></Button>
                    )}
                    <Button variant="danger" className="h-8 w-8 p-0" onClick={()=>handleDelete(item)} title="Sil"><Trash2 size={14}/></Button>
                    </div>
                </div>
                
                <div className="bg-slate-900/50 p-3 rounded text-sm text-slate-300 mb-3 max-h-60 overflow-y-auto">
                    {item.source === 'labor_cases' ? (
                        <div>
                            {Object.entries(item.answers || {}).map(([key, val]) => (
                                <div key={key} className="mb-1"><span className="text-amber-500 font-bold text-xs uppercase">{LABEL_MAPPING[key] || key}:</span> {val.text || "-"}</div>
                            ))}
                        </div>
                    ) : (
                        <div className="whitespace-pre-wrap">{item.question || item.notes || item.message || JSON.stringify(item, null, 2)}</div>
                    )}
                    {/* Ses ve Dosya Bağlantıları */}
                    {item.audioData && <div className="mt-2"><audio src={item.audioData} controls className="h-6 w-full max-w-xs" /></div>}
                    {item.fileData && <div className="mt-2"><a href={item.fileData.data} download={item.fileData.name} className="text-emerald-400 hover:underline flex items-center gap-1"><FileText size={14}/> {item.fileData.name}</a></div>}
                    {item.files && item.files.map((f,i) => <div key={i} className="mt-1"><a href={f.data} download={f.name} className="text-emerald-400 hover:underline flex items-center gap-1"><FileText size={14}/> {f.name}</a></div>)}
                </div>

                <div className="flex gap-2">
                    {item.source === 'feedbacks' && (
                      <>
                        {item.status !== 'approved' && item.status !== 'archived' && <Button variant="outline" className="h-8 text-xs border-emerald-600 text-emerald-500" onClick={()=>handleStatus(item, 'approved')}>Onayla / Yayınla</Button>}
                        {item.status !== 'rejected' && item.status !== 'archived' && <Button variant="outline" className="h-8 text-xs border-red-600 text-red-500" onClick={()=>handleStatus(item, 'rejected')}>Reddet</Button>}
                      </>
                    )}
                    {item.status === 'approved' && <span className="text-emerald-500 text-xs flex items-center gap-1"><CircleCheck size={12}/> Onaylandı</span>}
                </div>
                </div>
            ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState('home');
  const [menu, setMenu] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 1. Sekme Başlığı Güncelleme
    document.title = "Uzman Hukuk | Av. Fatih Uzman - Av. Kübra Karakuş";

    // 2. Auth Başlatma
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch(e) { console.error("Token Auth Error", e); }
      } else {
          try {
            await signInAnonymously(auth);
          } catch(e) { console.error("Anon Auth Error", e); }
      }
    };
    initAuth();

    // 3. Auth Listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const nav = (v) => { setView(v); setMenu(false); };

  if (!user && view === 'admin') return <div className="flex h-screen items-center justify-center bg-slate-900 text-white">Yükleniyor...</div>;

  if(view === 'admin') return <AdminPanel db={db} auth={auth} appId={appId} onNavigate={nav} />;

  return (
    <div className={`min-h-screen ${THEME.bg} text-slate-100 font-sans`}>
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div onClick={()=>nav('home')} className="text-xl font-bold text-white cursor-pointer">Uzman<span className="text-amber-500">Hukuk</span></div>
          <div className="hidden md:flex gap-6 items-center">
            {['home','hakkimizda','soru-sor','randevu','contact'].map(k => (
              <button 
                key={k} 
                onClick={()=>nav(k)} 
                className={`capitalize ${view===k?'text-amber-500':'text-slate-300 hover:text-white'}`}
              >
                {k === 'home' ? 'Anasayfa' : k === 'contact' ? 'İletişim' : k.replace('-',' ')}
              </button>
            ))}
            <Button variant="outline" className="h-8 text-xs" onClick={()=>setFeedback(true)}>Görüş Bildir</Button>
          </div>
          <button className="md:hidden" onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button>
        </div>
        {menu && <div className="md:hidden bg-slate-800 border-b border-slate-700 p-4 flex flex-col gap-4">
          {['home','soru-sor','randevu','contact'].map(k => (
            <button key={k} onClick={()=>nav(k)} className="text-left capitalize text-slate-300">
              {k === 'home' ? 'Anasayfa' : k === 'contact' ? 'İletişim' : k.replace('-',' ')}
            </button>
          ))}
        </div>}
      </nav>

      {feedback && <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="bg-slate-800 border border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative">
          <button onClick={()=>setFeedback(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20}/></button>
          <h3 className="text-xl font-bold text-white mb-4">Görüş Bildir</h3>
          <form onSubmit={async (e)=>{
              e.preventDefault(); 
              if (!user) return alert("Lütfen bekleyiniz, bağlantı kuruluyor...");
              
              setFeedbackLoading(true);
              try {
                await addDoc(collection(db,'artifacts',appId,'public', 'data','feedbacks'),{
                    name: e.target.name.value,
                    phone: e.target.phone.value,
                    message:e.target.msg.value, 
                    type:'teşekkür', 
                    status:'new', 
                    createdAt: serverTimestamp()
                }); 
                setFeedback(false); 
                alert("Görüşleriniz için teşekkürler! Mesajınız alındı.");
              } catch(err) {
                console.error("Görüş bildirme hatası:", err);
                alert("Mesaj gönderilirken bir hata oluştu: " + err.message);
              } finally {
                setFeedbackLoading(false);
              }
          }}>
            <Input name="name" label="Ad Soyad" required />
            <Input name="phone" label="Telefon" required />
            <TextAreaInput name="msg" label="Mesajınız" required />
            <Button type="submit" disabled={feedbackLoading} className="w-full">
              {feedbackLoading ? 'Gönderiliyor...' : 'Gönder'}
            </Button>
          </form>
        </div>
      </div>}
      
      <main className="min-h-[calc(100vh-200px)]">
        {view === 'home' && <HomeView onNavigate={nav} db={db} appId={appId} user={user} />}
        {view === 'hakkimizda' && <HakkimizdaView onNavigate={nav} />}
        {view === 'soru-sor' && (
            <div className="animate-fadeIn">
                 <WizardForm db={db} appId={appId} onSwitchToGeneral={() => setView('soru-genel')} />
            </div>
        )}
        {view === 'soru-genel' && <div className="animate-fadeIn"><button onClick={() => nav('soru-sor')} className="absolute top-24 left-6 md:left-20 text-slate-500 hover:text-white flex items-center gap-2"><ChevronLeft size={16}/> Geri</button><GeneralQuestionForm db={db} appId={appId} /></div>}
        {view === 'randevu' && <AppointmentForm db={db} appId={appId} />}
        {view === 'contact' && <div className="container mx-auto py-20 text-center">
            <h2 className="text-3xl font-bold mb-8">İletişim</h2>
            <div className="inline-block bg-slate-800 p-8 rounded-2xl text-left">
                <div className="flex items-center mb-4">
                    <Phone className="inline mr-3 text-amber-500"/> <span className="text-lg">0541 807 37 41</span>
                </div>
                <div className="flex items-center mb-4">
                    <span className="w-6 text-center mr-3 text-amber-500 font-bold">@</span> <span className="text-lg">av.fatihuzman@gmail.com</span>
                </div>
                <div className="flex items-start">
                    <MapPin className="inline mr-3 text-amber-500 mt-1"/> 
                    <span className="text-lg max-w-xs">Gaziler Mah. Issıkgöl Cad. No:138 D:10<br/>Gökçe Vizyon Plaza<br/>Gebze, Kocaeli</span>
                </div>
            </div>
        </div>}
      </main>

      <footer className="bg-slate-950 py-8 border-t border-slate-900 text-center text-slate-500 text-sm">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <span>&copy; 2025 Uzman Hukuk</span>
          <button onClick={()=>nav('admin')} className="flex items-center gap-1 hover:text-amber-500"><Lock size={12}/> Yönetici</button>
        </div>
      </footer>
      <Analytics />
    </div>
  );
}