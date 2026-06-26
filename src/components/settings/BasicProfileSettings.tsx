import React, { useEffect, useState } from 'react';
import { User, Check } from 'lucide-react';

interface BasicProfile {
    name?: string;
    role?: string;
    experienceYears?: string;
    company?: string;
    skills?: string;
    bio?: string;
    jobDescription?: string;
}

/**
 * BasicProfileSettings — open-source profile intelligence editor.
 *
 * Stores a lightweight profile (who you are) that gets injected into AI prompts
 * so answers are tailored to you. This is the free fallback for the premium
 * Profile Intelligence engine (resume parsing / RAG / negotiation), which is not
 * included in this build.
 */
const FIELDS: { key: keyof BasicProfile; label: string; placeholder: string; textarea?: boolean }[] = [
    { key: 'name', label: 'Name', placeholder: 'e.g. Mohammed Ayan' },
    { key: 'role', label: 'Role / Title', placeholder: 'e.g. Senior Software Engineer' },
    { key: 'experienceYears', label: 'Years of experience', placeholder: 'e.g. 6' },
    { key: 'company', label: 'Company', placeholder: 'e.g. Acme Corp' },
    { key: 'skills', label: 'Key skills', placeholder: 'e.g. React, Node, Rust, distributed systems' },
    { key: 'bio', label: 'Background', placeholder: 'A few sentences about your experience and strengths…', textarea: true },
    { key: 'jobDescription', label: 'Target job description', placeholder: 'Paste the JD for the role you are interviewing / meeting for — answers will be tuned to it…', textarea: true },
];

export const BasicProfileSettings: React.FC = () => {
    const [profile, setProfile] = useState<BasicProfile>({});
    const [enabled, setEnabled] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        window.electronAPI?.profileGetBasic?.()
            .then((res) => {
                if (res) {
                    setProfile(res.profile || {});
                    setEnabled(!!res.enabled);
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const update = (key: keyof BasicProfile, value: string) => {
        setProfile((prev) => ({ ...prev, [key]: value }));
        setSaved(false);
    };

    const handleSave = async () => {
        await window.electronAPI?.profileSaveBasic?.({ profile, enabled });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    if (loading) return null;

    return (
        <div className="bg-bg-item-surface rounded-xl border border-border-subtle p-5 mb-6">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-bg-component flex items-center justify-center">
                        <User size={15} className="text-text-primary" />
                    </div>
                    <h3 className="text-sm font-bold text-text-primary">Profile Intelligence</h3>
                    <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">FREE</span>
                </div>
                {/* Enable toggle */}
                <button
                    onClick={() => { setEnabled((v) => !v); setSaved(false); }}
                    className={`relative w-10 h-5.5 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-bg-component'}`}
                    style={{ width: 40, height: 22 }}
                    aria-label="Toggle profile intelligence"
                >
                    <span
                        className="absolute top-0.5 left-0.5 bg-white rounded-full transition-transform"
                        style={{ width: 18, height: 18, transform: enabled ? 'translateX(18px)' : 'translateX(0)' }}
                    />
                </button>
            </div>
            <p className="text-xs text-text-secondary mb-4">
                Tell Whispr who you are. When enabled, this is added to every AI answer so responses are tailored to your background.
            </p>

            <div className="space-y-3">
                {FIELDS.map((f) => (
                    <div key={f.key}>
                        <label className="block text-[11px] font-medium text-text-secondary mb-1">{f.label}</label>
                        {f.textarea ? (
                            <textarea
                                value={profile[f.key] || ''}
                                onChange={(e) => update(f.key, e.target.value)}
                                placeholder={f.placeholder}
                                rows={3}
                                className="w-full px-3 py-2 rounded-lg bg-bg-component border border-border-subtle text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-emerald-500/40 resize-none"
                            />
                        ) : (
                            <input
                                type="text"
                                value={profile[f.key] || ''}
                                onChange={(e) => update(f.key, e.target.value)}
                                placeholder={f.placeholder}
                                className="w-full px-3 py-2 rounded-lg bg-bg-component border border-border-subtle text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-emerald-500/40"
                            />
                        )}
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-end gap-3 mt-4">
                {saved && <span className="text-[11px] text-emerald-500 flex items-center gap-1"><Check size={12} /> Saved</span>}
                <button
                    onClick={handleSave}
                    className="px-4 py-1.5 rounded-full bg-text-primary text-bg-main text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all"
                >
                    Save profile
                </button>
            </div>
        </div>
    );
};
