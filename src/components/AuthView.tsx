import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Mail, MapPin, Phone, Shield, ShieldCheck, Store, UserRound } from 'lucide-react';

type TabKey = 'admin' | 'user' | 'services';

type UserFormState = {
  name: string;
  phone: string;
  email: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pin: string;
  emergency1Name: string;
  emergency1Relation: string;
  emergency1Phone: string;
  emergency2Name: string;
  emergency2Relation: string;
  emergency2Phone: string;
  consent: boolean;
};

type ServiceFormState = {
  serviceCategory: string;
  serviceType: string;
  name: string;
  phone: string;
  email: string;
  emergency1Name: string;
  emergency1Relation: string;
  emergency1Phone: string;
  emergency2Name: string;
  emergency2Relation: string;
  emergency2Phone: string;
  consent: boolean;
  emailCode: string;
};

const tabOrder: TabKey[] = ['admin', 'user', 'services'];

const indianStates = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

const serviceGroups = {
  Transport: [
    'Taxi / Cab',
    'Auto-rickshaw',
    'Bus / Coach operator',
    'Self-drive rental (car or bike)',
    'Tour vehicle with driver',
    'Boat / Ferry operator',
  ],
  Stays: ['Hotel', 'Resort', 'Homestay', 'Guest house', 'Hostel', 'Camp / Eco-stay'],
};

const emergencyRelations = ['Parent', 'Spouse', 'Sibling', 'Child', 'Friend', 'Other'];

const initialUserForm: UserFormState = {
  name: 'Aarav Sharma',
  phone: '',
  email: 'guest@example.com',
  line1: '',
  line2: '',
  city: '',
  state: 'Himachal Pradesh',
  pin: '',
  emergency1Name: '',
  emergency1Relation: 'Parent',
  emergency1Phone: '',
  emergency2Name: '',
  emergency2Relation: 'Sibling',
  emergency2Phone: '',
  consent: false,
};

const initialServiceForm: ServiceFormState = {
  serviceCategory: 'Transport',
  serviceType: 'Taxi / Cab',
  name: '',
  phone: '',
  email: '',
  emergency1Name: '',
  emergency1Relation: 'Parent',
  emergency1Phone: '',
  emergency2Name: '',
  emergency2Relation: 'Sibling',
  emergency2Phone: '',
  consent: false,
  emailCode: '',
};

const phonePattern = /^[6-9]\d{9}$/;
const pinPattern = /^[1-9][0-9]{5}$/;

const setDemoAuth = (role: 'admin' | 'user' | 'services', email: string, name?: string) => {
  const session = {
    role,
    email,
    name: name || role,
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem('safeway-demo-session', JSON.stringify(session));
  window.dispatchEvent(new Event('safeway-demo-auth'));
};

const notify = (message: string) => {
  window.alert(message);
};

export const AuthView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('user');
  const [userForm, setUserForm] = useState<UserFormState>(initialUserForm);
  const [serviceForm, setServiceForm] = useState<ServiceFormState>(initialServiceForm);
  const [auditMessage, setAuditMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [uidaiOpen, setUidaiOpen] = useState(false);
  const [uidaiStage, setUidaiStage] = useState<'identifier' | 'otp'>('identifier');
  const [uidaiIdentifier, setUidaiIdentifier] = useState('');
  const [uidaiOtp, setUidaiOtp] = useState('');
  const [uidaiVerified, setUidaiVerified] = useState(false);
  const [otpSeconds, setOtpSeconds] = useState(60);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as TabKey;
    if (tabOrder.includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (!uidaiOpen || uidaiStage !== 'otp') return;
    const timer = window.setInterval(() => {
      setOtpSeconds(prev => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [uidaiOpen, uidaiStage]);

  const tabPanelId = useMemo(
    () => ({
      admin: 'tab-panel-admin',
      user: 'tab-panel-user',
      services: 'tab-panel-services',
    }),
    []
  );

  const moveFocus = (direction: number) => {
    const currentIndex = tabOrder.indexOf(activeTab);
    const nextIndex = (currentIndex + direction + tabOrder.length) % tabOrder.length;
    const nextTab = tabOrder[nextIndex];
    setActiveTab(nextTab);
    tabRefs.current[nextIndex]?.focus();
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, tab: TabKey) => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        moveFocus(1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        moveFocus(-1);
        break;
      case 'Home':
        event.preventDefault();
        setActiveTab('admin');
        tabRefs.current[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        setActiveTab('services');
        tabRefs.current[tabOrder.length - 1]?.focus();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        setActiveTab(tab);
        break;
      default:
        break;
    }
  };

  const validateUserForm = () => {
    const nextErrors: Record<string, string> = {};

    if (userForm.name.trim().length < 2 || userForm.name.trim().length > 80) {
      nextErrors.name = 'Full name must be between 2 and 80 characters.';
    }
    if (!phonePattern.test(userForm.phone.replace(/\s+/g, ''))) {
      nextErrors.phone = 'Phone number must be a valid Indian mobile number.';
    }
    if (!userForm.email.trim()) {
      nextErrors.email = 'Email is required.';
    }
    if (userForm.line1.trim().length < 5 || userForm.line1.trim().length > 120) {
      nextErrors.line1 = 'Address line 1 must be 5 to 120 characters.';
    }
    if (userForm.city.trim().length < 2 || userForm.city.trim().length > 60) {
      nextErrors.city = 'City is required.';
    }
    if (!userForm.state.trim()) {
      nextErrors.state = 'State is required.';
    }
    if (!pinPattern.test(userForm.pin)) {
      nextErrors.pin = 'PIN must be a 6-digit Indian postal code.';
    }
    if (userForm.emergency1Name.trim().length < 2 || userForm.emergency1Name.trim().length > 80) {
      nextErrors.emergency1Name = 'Emergency contact 1 name is required.';
    }
    if (!phonePattern.test(userForm.emergency1Phone.replace(/\s+/g, ''))) {
      nextErrors.emergency1Phone = 'Emergency contact 1 phone is invalid.';
    }
    if (userForm.emergency2Name.trim().length < 2 || userForm.emergency2Name.trim().length > 80) {
      nextErrors.emergency2Name = 'Emergency contact 2 name is required.';
    }
    if (!phonePattern.test(userForm.emergency2Phone.replace(/\s+/g, ''))) {
      nextErrors.emergency2Phone = 'Emergency contact 2 phone is invalid.';
    }
    if (userForm.emergency1Phone && userForm.emergency2Phone && userForm.emergency1Phone === userForm.emergency2Phone) {
      nextErrors.emergency2Phone = 'Emergency contact numbers must be different.';
    }
    if (userForm.phone && userForm.emergency1Phone && userForm.phone === userForm.emergency1Phone) {
      nextErrors.emergency1Phone = 'Emergency contact cannot match your own phone number.';
    }
    if (userForm.phone && userForm.emergency2Phone && userForm.phone === userForm.emergency2Phone) {
      nextErrors.emergency2Phone = 'Emergency contact cannot match your own phone number.';
    }
    if (!userForm.consent) {
      nextErrors.consent = 'You must agree to the terms and privacy policy.';
    }

    setValidationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateServiceForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!serviceForm.serviceType.trim()) {
      nextErrors.serviceType = 'Service type is required.';
    }
    if (serviceForm.name.trim().length < 2 || serviceForm.name.trim().length > 80) {
      nextErrors.name = 'Name must be between 2 and 80 characters.';
    }
    if (!phonePattern.test(serviceForm.phone.replace(/\s+/g, ''))) {
      nextErrors.phone = 'Phone number must be a valid Indian mobile number.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(serviceForm.email)) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (!serviceForm.emailCode || serviceForm.emailCode.length !== 6) {
      nextErrors.emailCode = 'Email verification code is required.';
    }
    if (serviceForm.emergency1Name.trim().length < 2 || serviceForm.emergency1Name.trim().length > 80) {
      nextErrors.emergency1Name = 'Emergency contact 1 name is required.';
    }
    if (!phonePattern.test(serviceForm.emergency1Phone.replace(/\s+/g, ''))) {
      nextErrors.emergency1Phone = 'Emergency contact 1 phone is invalid.';
    }
    if (serviceForm.emergency2Name.trim().length < 2 || serviceForm.emergency2Name.trim().length > 80) {
      nextErrors.emergency2Name = 'Emergency contact 2 name is required.';
    }
    if (!phonePattern.test(serviceForm.emergency2Phone.replace(/\s+/g, ''))) {
      nextErrors.emergency2Phone = 'Emergency contact 2 phone is invalid.';
    }
    if (serviceForm.emergency1Phone && serviceForm.emergency2Phone && serviceForm.emergency1Phone === serviceForm.emergency2Phone) {
      nextErrors.emergency2Phone = 'Emergency contact numbers must be different.';
    }
    if (serviceForm.phone && serviceForm.emergency1Phone && serviceForm.phone === serviceForm.emergency1Phone) {
      nextErrors.emergency1Phone = 'Emergency contact cannot match your own phone number.';
    }
    if (serviceForm.phone && serviceForm.emergency2Phone && serviceForm.phone === serviceForm.emergency2Phone) {
      nextErrors.emergency2Phone = 'Emergency contact cannot match your own phone number.';
    }
    if (!serviceForm.consent) {
      nextErrors.consent = 'You must agree to the provider declaration and privacy notice.';
    }

    setValidationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitUserForm = () => {
    if (!validateUserForm()) {
      setAuditMessage('Please correct the highlighted tourist onboarding errors.');
      return;
    }
    setAuditMessage('Tourist onboarding submitted successfully. Redirecting to /user');
    setDemoAuth('user', userForm.email, userForm.name);
    notify('Tourist profile saved. Welcome to SafeWay.');
  };

  const submitServiceForm = () => {
    if (!validateServiceForm()) {
      setAuditMessage('Please correct the highlighted service provider onboarding errors.');
      return;
    }
    setAuditMessage('Services onboarding submitted. Your application is pending admin approval.');
    setDemoAuth('services', serviceForm.email, serviceForm.name);
    notify('Service profile submitted. Pending approval.');
  };

  const startUidai = () => {
    if (!uidaiIdentifier.trim()) {
      setAuditMessage('Please enter your 12-digit Aadhaar number or 16-digit VID.');
      return;
    }
    setUidaiStage('otp');
    setUidaiOtp('');
    setOtpSeconds(60);
    setAuditMessage('OTP sent to your registered mobile number.');
  };

  const confirmUidai = () => {
    if (uidaiOtp.length !== 6) {
      setAuditMessage('Please enter the 6-digit OTP from UIDAI.');
      return;
    }
    if (uidaiOtp !== '123456') {
      setAuditMessage('Incorrect OTP. Please use the mock code 123456 for this demo.');
      return;
    }
    setUidaiVerified(true);
    setUidaiOpen(false);
    setAuditMessage('UIDAI verification successful. Please complete the services onboarding form.');
    setDemoAuth('services', serviceForm.email || 'service@example.com', serviceForm.name || 'Service Provider');
  };

  const renderFieldError = (field: string) => {
    if (!validationErrors[field]) return null;
    return (
      <p id={`${field}-error`} className="mt-1 text-xs text-red-500" aria-live="polite">
        {validationErrors[field]}
      </p>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-10 text-[var(--text)]">
      <div className="mx-auto w-full max-w-[880px] rounded-[var(--radius)] bg-[var(--card)] shadow-[var(--shadow)] ring-1 ring-[var(--border)]">
        <header className="px-6 pb-4 pt-8 text-center md:px-10">
          <div className="mb-2 inline-flex items-center gap-3 rounded-full border border-[var(--border)] bg-[#f8fafc] px-3 py-2 text-xs font-medium text-[var(--muted)]">
            <span className="text-[var(--primary)]">SafeWay</span>
            <span>•</span>
            <span>Digital access gateway</span>
          </div>
          <h1 className="text-2xl font-semibold text-[var(--text)] md:text-3xl">Sign in to continue to your workspace</h1>
        </header>

        <div className="px-4 pb-4 md:px-6">
          <div className="grid grid-cols-3 gap-3" role="tablist" aria-label="Choose how you sign in" style={{ gridTemplateColumns: '1.6fr 1fr 1fr' }}>
            {[
              { key: 'admin', label: 'Admin', icon: Shield, accent: 'bg-[var(--admin-accent)] text-white', muted: 'text-slate-200' },
              { key: 'user', label: 'User', icon: UserRound, accent: 'bg-[var(--primary)] text-white', muted: 'text-slate-200' },
              { key: 'services', label: 'Services', icon: Store, accent: 'bg-[var(--primary)] text-white', muted: 'text-slate-200' },
            ].map(({ key, label, icon: Icon, accent, muted }, index) => {
              const selected = activeTab === key;
              return (
                <button
                  key={key}
                  ref={element => {
                    tabRefs.current[index] = element;
                  }}
                  type="button"
                  role="tab"
                  id={`tab-${key}`}
                  aria-selected={selected}
                  aria-controls={tabPanelId[key as keyof typeof tabPanelId]}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveTab(key as TabKey)}
                  onKeyDown={event => handleTabKeyDown(event, key as TabKey)}
                  className={[
                    'relative flex h-[72px] items-center justify-center gap-2 rounded-[14px] border transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#93c5fd] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                    selected
                      ? `${accent} shadow-[0_8px_20px_rgba(29,78,216,0.18)]`
                      : 'border-[var(--border)] bg-white text-[var(--muted)] hover:-translate-y-0.5 hover:border-[var(--primary)] hover:text-[var(--primary)]',
                    key === 'admin' ? 'h-[88px]' : 'h-[72px]',
                    key === 'admin' ? 'text-lg font-semibold' : 'text-base font-semibold',
                  ].join(' ')}
                  aria-disabled={false}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span className={selected ? 'text-white' : ''}>{label}</span>
                  {selected && <span className="absolute -bottom-[3px] left-4 right-4 h-[3px] rounded-full bg-white/90" />}
                </button>
              );
            })}
          </div>

          <section
            id={tabPanelId[activeTab]}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            className="mt-4 rounded-[14px] border border-[var(--border)] bg-white p-5 md:p-7"
          >
            {activeTab === 'admin' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-[var(--text)]">Administrator sign-in</h2>
                  <p className="text-sm text-[var(--muted)]">Only authorized administrator accounts can sign in.</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAuditMessage('Admin Google sign-in requested.');
                    setDemoAuth('admin', 'admin@safeway.local', 'Administrator');
                    notify('Google sign-in accepted for allowlisted admin account.');
                  }}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#d1d5db] bg-white px-4 py-3 text-base font-medium text-[#111827] shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <path fill="#4285F4" d="M21.6 12.23c0-.7-.06-1.37-.19-2.01H12v3.79h5.39a4.6 4.6 0 0 1-1.99 3.02v2.5h3.22c1.89-1.74 2.98-4.3 2.98-7.3Z" />
                    <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.22-2.5c-.9.6-2.05.96-3.4.96a6.63 6.63 0 0 1-6.29-4.55H.68v2.61A10 10 0 0 0 12 22Z" />
                    <path fill="#FBBC05" d="M5.71 18.43A6.62 6.62 0 0 1 5.4 12c0-.72.13-1.41.37-2.07V7.32H2.46A10 10 0 0 0 .95 12c0 1.6.38 3.12 1.06 4.45l3.7-2.02Z" />
                    <path fill="#EA4335" d="M12 4.96c1.52 0 2.88.52 3.96 1.54l2.98-2.98A10 10 0 0 0 2.52 7.32l3.31 2.61A6.63 6.63 0 0 1 12 4.96Z" />
                  </svg>
                  Continue with Google
                </button>
              </div>
            )}

            {activeTab === 'user' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-[var(--text)]">Welcome, traveller</h2>
                  <p className="text-sm text-[var(--muted)]">Continue with Google to access your tourist profile.</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAuditMessage('Google sign-in requested for user onboarding.');
                    setDemoAuth('user', userForm.email, userForm.name);
                    notify('Google authentication accepted. Complete your onboarding form.');
                  }}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#d1d5db] bg-white px-4 py-3 text-base font-medium text-[#111827] shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                    <path fill="#4285F4" d="M21.6 12.23c0-.7-.06-1.37-.19-2.01H12v3.79h5.39a4.6 4.6 0 0 1-1.99 3.02v2.5h3.22c1.89-1.74 2.98-4.3 2.98-7.3Z" />
                    <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.22-2.5c-.9.6-2.05.96-3.4.96a6.63 6.63 0 0 1-6.29-4.55H.68v2.61A10 10 0 0 0 12 22Z" />
                    <path fill="#FBBC05" d="M5.71 18.43A6.62 6.62 0 0 1 5.4 12c0-.72.13-1.41.37-2.07V7.32H2.46A10 10 0 0 0 .95 12c0 1.6.38 3.12 1.06 4.45l3.7-2.02Z" />
                    <path fill="#EA4335" d="M12 4.96c1.52 0 2.88.52 3.96 1.54l2.98-2.98A10 10 0 0 0 2.52 7.32l3.31 2.61A6.63 6.63 0 0 1 12 4.96Z" />
                  </svg>
                  Continue with Google
                </button>

                <div className="rounded-2xl border border-[var(--border)] bg-[#f8fafc] p-4">
                  <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                    One-time onboarding details
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-[var(--text)]">Full name</label>
                      <input
                        value={userForm.name}
                        onChange={event => setUserForm({ ...userForm, name: event.target.value })}
                        className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                        aria-invalid={Boolean(validationErrors.name)}
                        aria-describedby={validationErrors.name ? 'name-error' : undefined}
                      />
                      {renderFieldError('name')}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-[var(--text)]">Contact number</label>
                      <input
                        value={userForm.phone}
                        onChange={event => setUserForm({ ...userForm, phone: event.target.value })}
                        className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                        aria-invalid={Boolean(validationErrors.phone)}
                      />
                      {renderFieldError('phone')}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-[var(--text)]">Email</label>
                      <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                        <Mail className="h-4 w-4" />
                        <span>{userForm.email || 'google-account@example.com'}</span>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-[var(--text)]">Address line 1</label>
                      <input
                        value={userForm.line1}
                        onChange={event => setUserForm({ ...userForm, line1: event.target.value })}
                        className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                        aria-invalid={Boolean(validationErrors.line1)}
                      />
                      {renderFieldError('line1')}
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-[var(--text)]">Address line 2</label>
                      <input
                        value={userForm.line2}
                        onChange={event => setUserForm({ ...userForm, line2: event.target.value })}
                        className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-[var(--text)]">City</label>
                      <input
                        value={userForm.city}
                        onChange={event => setUserForm({ ...userForm, city: event.target.value })}
                        className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                        aria-invalid={Boolean(validationErrors.city)}
                      />
                      {renderFieldError('city')}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-[var(--text)]">State</label>
                      <select
                        value={userForm.state}
                        onChange={event => setUserForm({ ...userForm, state: event.target.value })}
                        className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                      >
                        {indianStates.map(state => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-[var(--text)]">PIN code</label>
                      <input
                        value={userForm.pin}
                        onChange={event => setUserForm({ ...userForm, pin: event.target.value })}
                        className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                        aria-invalid={Boolean(validationErrors.pin)}
                      />
                      {renderFieldError('pin')}
                    </div>

                    <div className="md:col-span-2 mt-2 rounded-xl border border-[var(--border)] bg-white p-3">
                      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                        <MapPin className="h-4 w-4 text-[var(--primary)]" />
                        Emergency contact 1
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[var(--text)]">Name</label>
                          <input
                            value={userForm.emergency1Name}
                            onChange={event => setUserForm({ ...userForm, emergency1Name: event.target.value })}
                            className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                          />
                          {renderFieldError('emergency1Name')}
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[var(--text)]">Relationship</label>
                          <select
                            value={userForm.emergency1Relation}
                            onChange={event => setUserForm({ ...userForm, emergency1Relation: event.target.value })}
                            className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                          >
                            {emergencyRelations.map(relation => (
                              <option key={relation} value={relation}>
                                {relation}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-sm font-medium text-[var(--text)]">Phone</label>
                          <input
                            value={userForm.emergency1Phone}
                            onChange={event => setUserForm({ ...userForm, emergency1Phone: event.target.value })}
                            className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                          />
                          {renderFieldError('emergency1Phone')}
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 mt-2 rounded-xl border border-[var(--border)] bg-white p-3">
                      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                        <MapPin className="h-4 w-4 text-[var(--primary)]" />
                        Emergency contact 2
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[var(--text)]">Name</label>
                          <input
                            value={userForm.emergency2Name}
                            onChange={event => setUserForm({ ...userForm, emergency2Name: event.target.value })}
                            className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                          />
                          {renderFieldError('emergency2Name')}
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[var(--text)]">Relationship</label>
                          <select
                            value={userForm.emergency2Relation}
                            onChange={event => setUserForm({ ...userForm, emergency2Relation: event.target.value })}
                            className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                          >
                            {emergencyRelations.map(relation => (
                              <option key={relation} value={relation}>
                                {relation}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-sm font-medium text-[var(--text)]">Phone</label>
                          <input
                            value={userForm.emergency2Phone}
                            onChange={event => setUserForm({ ...userForm, emergency2Phone: event.target.value })}
                            className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                          />
                          {renderFieldError('emergency2Phone')}
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 mt-1 flex items-start gap-3 rounded-xl border border-[var(--border)] bg-slate-50 p-3">
                      <input
                        id="tourist-consent"
                        type="checkbox"
                        checked={userForm.consent}
                        onChange={event => setUserForm({ ...userForm, consent: event.target.checked })}
                        className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                      />
                      <label htmlFor="tourist-consent" className="text-sm text-[var(--muted)]">
                        I agree to the Terms and Privacy Policy and consent to my emergency contacts being used in an emergency.
                      </label>
                    </div>
                    {renderFieldError('consent')}
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={submitUserForm}
                      className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                    >
                      Save onboarding details
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'services' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold text-[var(--text)]">Service provider verification</h2>
                  <p className="text-sm text-[var(--muted)]">Identity verification through UIDAI is required for all transport and stay providers.</p>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[#f8fafc] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm font-medium text-[var(--text)]">UIDAI sandbox status</div>
                    <button
                      type="button"
                      onClick={() => setUidaiOpen(true)}
                      className="inline-flex items-center justify-center rounded-xl bg-[var(--admin-accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                    >
                      {uidaiVerified ? 'Verified with UIDAI' : 'Verify with UIDAI'}
                    </button>
                  </div>
                  {uidaiVerified && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                      <ShieldCheck className="h-4 w-4" />
                      Identity confirmed. You can complete your onboarding.
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[var(--text)]">Service category</label>
                      <select
                        value={serviceForm.serviceCategory}
                        onChange={event => {
                          const nextCategory = event.target.value;
                          const nextType = Object.entries(serviceGroups).find(([group]) => group === nextCategory)?.[1][0] ?? '';
                          setServiceForm({ ...serviceForm, serviceCategory: nextCategory, serviceType: nextType });
                        }}
                        className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                      >
                        {Object.keys(serviceGroups).map(group => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-[var(--text)]">Type of service</label>
                      <select
                        value={serviceForm.serviceType}
                        onChange={event => setServiceForm({ ...serviceForm, serviceType: event.target.value })}
                        className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                      >
                        {serviceGroups[serviceForm.serviceCategory as keyof typeof serviceGroups]?.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      {renderFieldError('serviceType')}
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-[var(--text)]">Name</label>
                      <input
                        value={serviceForm.name}
                        onChange={event => setServiceForm({ ...serviceForm, name: event.target.value })}
                        className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                      />
                      {renderFieldError('name')}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-[var(--text)]">Contact number</label>
                      <input
                        value={serviceForm.phone}
                        onChange={event => setServiceForm({ ...serviceForm, phone: event.target.value })}
                        className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                      />
                      {renderFieldError('phone')}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-[var(--text)]">Email</label>
                      <input
                        type="email"
                        value={serviceForm.email}
                        onChange={event => setServiceForm({ ...serviceForm, email: event.target.value })}
                        className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                      />
                      {renderFieldError('email')}
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-[var(--text)]">Email verification code</label>
                      <div className="flex gap-3">
                        <input
                          value={serviceForm.emailCode}
                          onChange={event => setServiceForm({ ...serviceForm, emailCode: event.target.value.replace(/\D/g, '').slice(0, 6) })}
                          className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                          placeholder="6 digit code"
                        />
                        <button
                          type="button"
                          onClick={() => setAuditMessage('A 6-digit verification code was sent to your email address.')}
                          className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                        >
                          Send code
                        </button>
                      </div>
                      {renderFieldError('emailCode')}
                    </div>

                    <div className="md:col-span-2 mt-2 rounded-xl border border-[var(--border)] bg-slate-50 p-3">
                      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                        <Phone className="h-4 w-4 text-[var(--primary)]" />
                        Emergency contact 1
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[var(--text)]">Name</label>
                          <input
                            value={serviceForm.emergency1Name}
                            onChange={event => setServiceForm({ ...serviceForm, emergency1Name: event.target.value })}
                            className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                          />
                          {renderFieldError('emergency1Name')}
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[var(--text)]">Relationship</label>
                          <select
                            value={serviceForm.emergency1Relation}
                            onChange={event => setServiceForm({ ...serviceForm, emergency1Relation: event.target.value })}
                            className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                          >
                            {emergencyRelations.map(relation => (
                              <option key={relation} value={relation}>
                                {relation}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-sm font-medium text-[var(--text)]">Phone</label>
                          <input
                            value={serviceForm.emergency1Phone}
                            onChange={event => setServiceForm({ ...serviceForm, emergency1Phone: event.target.value })}
                            className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                          />
                          {renderFieldError('emergency1Phone')}
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 mt-2 rounded-xl border border-[var(--border)] bg-slate-50 p-3">
                      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                        <Phone className="h-4 w-4 text-[var(--primary)]" />
                        Emergency contact 2
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[var(--text)]">Name</label>
                          <input
                            value={serviceForm.emergency2Name}
                            onChange={event => setServiceForm({ ...serviceForm, emergency2Name: event.target.value })}
                            className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                          />
                          {renderFieldError('emergency2Name')}
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-[var(--text)]">Relationship</label>
                          <select
                            value={serviceForm.emergency2Relation}
                            onChange={event => setServiceForm({ ...serviceForm, emergency2Relation: event.target.value })}
                            className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                          >
                            {emergencyRelations.map(relation => (
                              <option key={relation} value={relation}>
                                {relation}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-sm font-medium text-[var(--text)]">Phone</label>
                          <input
                            value={serviceForm.emergency2Phone}
                            onChange={event => setServiceForm({ ...serviceForm, emergency2Phone: event.target.value })}
                            className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                          />
                          {renderFieldError('emergency2Phone')}
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 mt-1 flex items-start gap-3 rounded-xl border border-[var(--border)] bg-slate-50 p-3">
                      <input
                        id="services-consent"
                        type="checkbox"
                        checked={serviceForm.consent}
                        onChange={event => setServiceForm({ ...serviceForm, consent: event.target.checked })}
                        className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                      />
                      <label htmlFor="services-consent" className="text-sm text-[var(--muted)]">
                        I agree to the Terms, Privacy Policy, and verified-provider declaration.
                      </label>
                    </div>
                    {renderFieldError('consent')}
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={submitServiceForm}
                      className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                    >
                      Submit provider profile
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {auditMessage && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700" aria-live="polite">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
              <span>{auditMessage}</span>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-center gap-5 border-t border-[var(--border)] px-6 py-4 text-xs text-[var(--muted)] md:px-10">
          <a href="#" className="hover:text-[var(--text)]">Privacy policy</a>
          <a href="#" className="hover:text-[var(--text)]">Terms</a>
          <a href="#" className="hover:text-[var(--text)]">Help</a>
        </footer>
      </div>

      {uidaiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-[0_25px_80px_rgba(15,23,42,0.35)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text)]">UIDAI verification</h3>
              <button type="button" onClick={() => setUidaiOpen(false)} className="text-sm text-slate-500 hover:text-slate-700">
                Close
              </button>
            </div>

            {uidaiStage === 'identifier' && (
              <div className="space-y-4">
                <p className="text-sm text-[var(--muted)]">Enter your 12-digit Aadhaar number or 16-digit VID.</p>
                <input
                  value={uidaiIdentifier}
                  onChange={event => setUidaiIdentifier(event.target.value.replace(/\D/g, '').slice(0, 16))}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                  placeholder="12-digit Aadhaar / 16-digit VID"
                />
                <button
                  type="button"
                  onClick={startUidai}
                  className="w-full rounded-xl bg-[var(--admin-accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Continue
                </button>
              </div>
            )}

            {uidaiStage === 'otp' && (
              <div className="space-y-4">
                <p className="text-sm text-[var(--muted)]">Enter the 6-digit OTP sent to your registered mobile number.</p>
                <input
                  value={uidaiOtp}
                  onChange={event => setUidaiOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100"
                  placeholder="OTP"
                />

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Resend in {otpSeconds}s</span>
                  <button
                    type="button"
                    disabled={otpSeconds > 0}
                    onClick={() => {
                      setOtpSeconds(60);
                      setAuditMessage('New UIDAI OTP sent.');
                    }}
                    className="disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    Resend OTP
                  </button>
                </div>

                <button
                  type="button"
                  onClick={confirmUidai}
                  className="w-full rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  Verify OTP
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
