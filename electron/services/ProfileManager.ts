import { app } from 'electron';
import fs from 'fs';
import path from 'path';

/**
 * ProfileManager — minimal, open-source profile intelligence.
 *
 * Stores a lightweight user profile (who you are) and exposes it as a
 * prompt-injectable context string so AI answers can be tailored to the user.
 * This is the open-source replacement for the premium KnowledgeOrchestrator's
 * profile features — it does NOT do resume parsing, RAG, JD analysis, company
 * research, or negotiation. It just remembers who you are and feeds that to the LLM.
 */
export interface BasicProfile {
    name?: string;
    role?: string;
    experienceYears?: string;
    company?: string;
    skills?: string;
    bio?: string;
    jobDescription?: string;
    resumeText?: string;
}

interface ProfileFile {
    enabled: boolean;
    profile: BasicProfile;
}

export class ProfileManager {
    private static instance: ProfileManager | null = null;
    private filePath: string;
    private data: ProfileFile = { enabled: false, profile: {} };

    private constructor() {
        this.filePath = path.join(app.getPath('userData'), 'basic_profile.json');
        this.load();
    }

    public static getInstance(): ProfileManager {
        if (!ProfileManager.instance) {
            ProfileManager.instance = new ProfileManager();
        }
        return ProfileManager.instance;
    }

    private load(): void {
        try {
            if (fs.existsSync(this.filePath)) {
                const raw = fs.readFileSync(this.filePath, 'utf-8');
                const parsed = JSON.parse(raw);
                this.data = {
                    enabled: !!parsed.enabled,
                    profile: parsed.profile || {},
                };
            }
        } catch (err) {
            console.warn('[ProfileManager] Failed to load profile, using defaults:', err);
            this.data = { enabled: false, profile: {} };
        }
    }

    private save(): void {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
        } catch (err) {
            console.error('[ProfileManager] Failed to save profile:', err);
        }
    }

    public getProfile(): BasicProfile {
        return this.data.profile;
    }

    public isEnabled(): boolean {
        return this.data.enabled;
    }

    public saveProfile(profile: BasicProfile, enabled: boolean): void {
        // Merge so uploaded résumé text (not part of the editor form) isn't wiped on save.
        const merged: BasicProfile = { ...this.data.profile, ...(profile || {}) };
        if (!profile || profile.resumeText === undefined) merged.resumeText = this.data.profile.resumeText;
        this.data = { enabled, profile: merged };
        this.save();
        console.log('[ProfileManager] Profile saved (enabled=' + enabled + ')');
    }

    /** Store an uploaded résumé's extracted text and enable the profile. */
    public setResumeText(text: string): void {
        this.data.profile.resumeText = text;
        this.data.enabled = true;
        this.save();
        console.log('[ProfileManager] Resume text stored (' + text.length + ' chars)');
    }

    /** Store an uploaded job description's extracted text and enable the profile. */
    public setJobDescriptionText(text: string): void {
        this.data.profile.jobDescription = text;
        this.data.enabled = true;
        this.save();
        console.log('[ProfileManager] Job description stored (' + text.length + ' chars)');
    }

    /** Extract plain text from a .pdf, .docx, .txt, or .md file. */
    public static async extractTextFromFile(filePath: string): Promise<string> {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.pdf') {
            const { PDFParse } = require('pdf-parse');
            const buffer = fs.readFileSync(filePath);
            const parser = new PDFParse({ data: buffer });
            try {
                const res = await parser.getText();
                return (res.text || '').trim();
            } finally {
                try { await parser.destroy(); } catch { /* ignore */ }
            }
        }
        if (ext === '.docx') {
            const mammoth = require('mammoth');
            const res = await mammoth.extractRawText({ path: filePath });
            return (res.value || '').trim();
        }
        // .txt, .md, or anything else: read as UTF-8
        return fs.readFileSync(filePath, 'utf-8').trim();
    }

    /** Whether any meaningful profile content exists. */
    public hasContent(): boolean {
        const p = this.data.profile;
        return !!(p.name || p.role || p.company || p.skills || p.bio || p.experienceYears || p.jobDescription || p.resumeText);
    }

    /**
     * Returns a prompt-injectable description of the user, or '' when disabled
     * or empty. Safe to prepend to any system prompt / context block.
     */
    public getContextString(): string {
        if (!this.data.enabled || !this.hasContent()) return '';
        const p = this.data.profile;
        const lines: string[] = [];
        if (p.name) lines.push(`Name: ${p.name}`);
        if (p.role) lines.push(`Role / Title: ${p.role}`);
        if (p.experienceYears) lines.push(`Years of experience: ${p.experienceYears}`);
        if (p.company) lines.push(`Company: ${p.company}`);
        if (p.skills) lines.push(`Key skills: ${p.skills}`);
        if (p.bio) lines.push(`Background: ${p.bio}`);

        const resume = (p.resumeText || '').trim();
        const resumeBlock = resume
            ? `\n\nRESUME (the user's full résumé — use it for accurate, specific answers about their experience; do not recite it verbatim unless asked):\n${resume.slice(0, 4000)}`
            : '';

        const jd = (p.jobDescription || '').trim();
        const jdBlock = jd
            ? `\n\nTARGET ROLE / JOB DESCRIPTION (the role the user is interviewing or meeting for):\n${jd.slice(0, 3000)}\nWhen relevant, tailor answers to this role — emphasize the skills, responsibilities, and priorities it calls for.`
            : '';

        if (!lines.length && !jd && !resume) return '';
        return `[ABOUT THE USER — background context for the candidate you assist]
${lines.join('\n')}${resumeBlock}${jdBlock}

How to use this background:
- Use it to personalize and ground your answers ONLY when the question actually calls for it.
- Give a full first-person self-introduction using this profile ONLY when the user is explicitly asked to introduce themselves (e.g. "introduce yourself", "tell me about yourself", "who am I"). In that case, answer AS the candidate (start with their name/role) — not as the AI.
- For every OTHER question, answer the actual question directly. Do NOT recite, summarize, or dump this profile unprompted.
- If a question is unclear, garbled, off-topic, or you don't understand it, ask a brief clarifying question or say you're not sure — do NOT fall back to reciting this profile.
[END ABOUT THE USER]`;
    }
}
