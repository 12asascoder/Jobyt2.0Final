'use client';

import { useState, useEffect } from 'react';
import { Input, Button } from '@/components/ui';
import { JOB_TYPES } from '@/constants';
import { FaMagnifyingGlass, FaLocationDot, FaFilterCircleXmark } from 'react-icons/fa6';

interface Filters {
    keyword?: string;
    location?: string;
    type?: string;
    salary_min?: number;
    salary_max?: number;
    sort?: string;
}

interface JobFiltersProps {
    onApply: (filters: Filters) => void;
    initialKeyword?: string;
    initialType?: string;
}

export const JobFilters = ({ onApply, initialKeyword = '', initialType = '' }: JobFiltersProps) => {
    const [filters, setFilters] = useState<Filters>({
        keyword: initialKeyword || undefined,
        type: initialType || undefined,
    });

    useEffect(() => {
        setFilters((prev) => ({
            ...prev,
            keyword: initialKeyword || undefined,
            type: initialType || undefined,
        }));
    }, [initialKeyword, initialType]);

    const set = (key: keyof Filters, value: string | number | undefined) =>
        setFilters((f) => ({ ...f, [key]: value || undefined }));

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-bold text-slate-900 flex items-center gap-2">
                <FaMagnifyingGlass className="text-brand-primary text-sm" />
                Filters
            </h3>
            <div className="flex flex-col gap-4">
                <Input
                    label="Keyword"
                    placeholder="Job title, skills…"
                    value={filters.keyword || ''}
                    onChange={(e) => set('keyword', e.target.value)}
                />
                <Input
                    label="Location"
                    placeholder="City or remote"
                    value={filters.location || ''}
                    onChange={(e) => set('location', e.target.value)}
                />

                <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Job Type</label>
                    <select
                        className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
                        value={filters.type || ''}
                        onChange={(e) => set('type', e.target.value)}
                    >
                        <option value="">All types</option>
                        {JOB_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <Input
                        label="Min Salary"
                        type="number"
                        placeholder="0"
                        onChange={(e) => set('salary_min', parseInt(e.target.value))}
                    />
                    <Input
                        label="Max Salary"
                        type="number"
                        placeholder="Any"
                        onChange={(e) => set('salary_max', parseInt(e.target.value))}
                    />
                </div>

                <Button onClick={() => onApply(filters)}>Apply Filters</Button>
                <Button
                    variant="ghost"
                    onClick={() => { setFilters({}); onApply({}); }}
                    className="flex items-center justify-center gap-2"
                >
                    <FaFilterCircleXmark className="text-sm" /> Clear
                </Button>
            </div>
        </div>
    );
};
