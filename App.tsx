/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import { 
    searchEvents, 
    draftSocialContent, 
    generateMarketingImage, 
    editMarketingImage 
} from './services/gemini';
import { 
    SearchResult, 
    SocialDraft, 
    AspectRatio, 
    ImageResolution, 
    AppView, 
    StudioMode 
} from './types';

// --- ICONS ---
const Icons = {
    Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
    Image: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>,
    Edit: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
    Send: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>,
    Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
    Loader: () => <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>,
    Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>,
    Copy: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
};

// --- API KEY MODAL ---
const ApiKeyModal: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSelectKey = async () => {
        setIsLoading(true);
        setError('');
        if (window.aistudio) {
            try {
                await window.aistudio.openSelectKey();
                const hasKey = await window.aistudio.hasSelectedApiKey();
                if (hasKey) {
                    onComplete();
                } else {
                    setError("Key selection cancelled.");
                }
            } catch (e: any) {
                if(e.message?.includes("Requested entity was not found")) {
                     setError("Invalid API Key or Project. Please select a valid paid project.");
                     // Retry logic implicit by staying on screen
                } else {
                     setError("Failed to select key. Please try again.");
                }
            } finally {
                setIsLoading(false);
            }
        } else {
            // Dev environment fallback
            onComplete();
        }
    };

    return (
        <div className="fixed inset-0 bg-[#121212] z-[100] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#1E1E1E] border border-gray-800 rounded-2xl p-8 shadow-2xl text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#00E5FF] to-[#FF007F] rounded-xl mx-auto mb-6 flex items-center justify-center">
                    <Icons.Sparkles />
                </div>
                <h1 className="text-3xl font-bold mb-2 decko-gradient-text">Decko Social Studio</h1>
                <p className="text-gray-400 mb-8">
                    To access premium features like Event Discovery and High-Fidelity Image Generation, please verify your account.
                </p>
                
                <button 
                    onClick={handleSelectKey}
                    disabled={isLoading}
                    className="w-full py-4 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                >
                    {isLoading ? <Icons.Loader /> : "Connect Google Cloud Project"}
                </button>
                
                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                
                <p className="text-xs text-gray-600 mt-6">
                    Requires a paid Google Cloud Project for Gemini 3 Pro & Search Grounding.
                </p>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-xs text-[#00E5FF] hover:underline block mt-2">
                    View Billing Documentation
                </a>
            </div>
        </div>
    );
};

// --- APP COMPONENT ---
const App: React.FC = () => {
    const [hasKey, setHasKey] = useState(false);
    const [currentView, setCurrentView] = useState<AppView>('DISCOVER');
    const [studioMode, setStudioMode] = useState<StudioMode>('GENERATE');

    // SEARCH STATE
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
    
    // DRAFT STATE
    const [isDrafting, setIsDrafting] = useState(false);
    const [draft, setDraft] = useState<SocialDraft | null>(null);

    // STUDIO STATE
    const [imagePrompt, setImagePrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [resolution, setResolution] = useState<ImageResolution>('1K');
    const [isGeneratingImg, setIsGeneratingImg] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    // EDIT STATE
    const [editFile, setEditFile] = useState<File | null>(null);
    const [editPreview, setEditPreview] = useState<string | null>(null);
    const [editInstruction, setEditInstruction] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editedImage, setEditedImage] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // INITIAL CHECK
    useEffect(() => {
        const check = async () => {
             if (window.aistudio) {
                 const selected = await window.aistudio.hasSelectedApiKey();
                 setHasKey(selected);
             } else {
                 setHasKey(true);
             }
        };
        check();
    }, []);

    // --- HANDLERS ---

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchResult(null);
        setDraft(null);
        try {
            const res = await searchEvents(searchQuery);
            setSearchResult(res);
        } catch (error) {
            console.error(error);
            alert("Search failed. Please check your API limits.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleDraftPost = async () => {
        if (!searchResult) return;
        setIsDrafting(true);
        try {
            const res = await draftSocialContent(searchResult.text);
            setDraft(res);
        } catch (error) {
            console.error(error);
        } finally {
            setIsDrafting(false);
        }
    };

    const handleSendToStudio = () => {
        if (draft) {
            setImagePrompt(draft.imagePrompt);
            setCurrentView('STUDIO');
            setStudioMode('GENERATE');
        }
    };

    const handleGenerateImage = async () => {
        if (!imagePrompt.trim()) return;
        setIsGeneratingImg(true);
        setGeneratedImage(null);
        try {
            const b64 = await generateMarketingImage(imagePrompt, aspectRatio, resolution);
            setGeneratedImage(b64);
        } catch (e: any) {
            console.error(e);
            if (e.message?.includes('404') || e.message?.includes('Requested entity was not found')) {
                setHasKey(false); // Trigger re-auth
            } else {
                alert("Image generation failed.");
            }
        } finally {
            setIsGeneratingImg(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setEditFile(file);
            const url = URL.createObjectURL(file);
            setEditPreview(url);
            setEditedImage(null);
        }
    };

    const handleEditImage = async () => {
        if (!editFile || !editInstruction.trim()) return;
        setIsEditing(true);
        try {
             // Convert file to base64
             const reader = new FileReader();
             reader.readAsDataURL(editFile);
             reader.onloadend = async () => {
                 const base64data = reader.result as string;
                 const rawBase64 = base64data.split(',')[1];
                 
                 try {
                    const result = await editMarketingImage(rawBase64, editFile.type, editInstruction);
                    setEditedImage(result);
                 } catch (e) {
                     console.error(e);
                     alert("Edit failed.");
                 } finally {
                     setIsEditing(false);
                 }
             };
        } catch (e) {
            setIsEditing(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could show toast here
    };

    if (!hasKey) {
        return <ApiKeyModal onComplete={() => setHasKey(true)} />;
    }

    return (
        <div className="flex h-screen w-full bg-[#121212] text-white overflow-hidden font-sans">
            
            {/* SIDEBAR */}
            <aside className="w-20 lg:w-64 border-r border-gray-800 flex flex-col items-center lg:items-start p-4 lg:p-6 bg-[#181818]">
                <div className="mb-10 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#00E5FF] to-[#FF007F] rounded-lg flex items-center justify-center shrink-0">
                        <span className="font-bold text-black text-xl">D</span>
                    </div>
                    <span className="hidden lg:block font-bold text-xl tracking-tight">Decko</span>
                </div>

                <nav className="w-full space-y-2">
                    <button 
                        onClick={() => setCurrentView('DISCOVER')}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${currentView === 'DISCOVER' ? 'bg-[#262626] text-[#00E5FF]' : 'text-gray-400 hover:bg-[#262626] hover:text-white'}`}
                    >
                        <Icons.Search />
                        <span className="hidden lg:block">Event Discovery</span>
                    </button>
                    
                    <button 
                        onClick={() => { setCurrentView('STUDIO'); setStudioMode('GENERATE'); }}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${currentView === 'STUDIO' && studioMode === 'GENERATE' ? 'bg-[#262626] text-[#FF007F]' : 'text-gray-400 hover:bg-[#262626] hover:text-white'}`}
                    >
                        <Icons.Image />
                        <span className="hidden lg:block">Create Image</span>
                    </button>

                    <button 
                        onClick={() => { setCurrentView('STUDIO'); setStudioMode('EDIT'); }}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${currentView === 'STUDIO' && studioMode === 'EDIT' ? 'bg-[#262626] text-[#FF007F]' : 'text-gray-400 hover:bg-[#262626] hover:text-white'}`}
                    >
                        <Icons.Edit />
                        <span className="hidden lg:block">Edit Image</span>
                    </button>
                </nav>

                <div className="mt-auto hidden lg:block">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900 to-black border border-gray-800">
                        <p className="text-xs text-gray-400 mb-2">Need help?</p>
                        <p className="text-sm font-semibold">Contact Decko Support</p>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                
                {/* DISCOVER VIEW */}
                {currentView === 'DISCOVER' && (
                    <div className="h-full flex flex-col max-w-5xl mx-auto w-full p-4 lg:p-8 overflow-y-auto">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold mb-2">Find Local Events</h2>
                            <p className="text-gray-400">Powered by Google Search Grounding to find real-time opportunities.</p>
                        </div>

                        <form onSubmit={handleSearch} className="mb-8 relative decko-border-glow rounded-xl">
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="e.g. 'Tech meetups in San Francisco this weekend'"
                                className="w-full bg-[#1E1E1E] border border-gray-700 text-white rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-[#00E5FF] transition-all"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                <Icons.Search />
                            </div>
                            <button 
                                type="submit" 
                                disabled={isSearching}
                                className="absolute right-2 top-2 bottom-2 bg-[#00E5FF] text-black font-semibold px-6 rounded-lg hover:bg-[#00cce6] transition-colors flex items-center gap-2"
                            >
                                {isSearching ? <Icons.Loader /> : "Search"}
                            </button>
                        </form>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                            {/* RESULTS COLUMN */}
                            <div className="bg-[#1E1E1E] rounded-xl border border-gray-800 p-6 min-h-[300px]">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Search Results</h3>
                                {searchResult ? (
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="prose prose-invert prose-sm mb-6">
                                            <p className="whitespace-pre-line leading-relaxed text-gray-300">{searchResult.text}</p>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {searchResult.sourceLinks.map((link, i) => (
                                                <a 
                                                    key={i} 
                                                    href={link.uri} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1 rounded-full text-[#00E5FF] truncate max-w-[200px] transition-colors"
                                                >
                                                    {link.title}
                                                </a>
                                            ))}
                                        </div>

                                        <button 
                                            onClick={handleDraftPost}
                                            disabled={isDrafting}
                                            className="w-full py-3 bg-[#FF007F] hover:bg-[#d9006c] rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            {isDrafting ? <Icons.Loader /> : <>Generate Social Draft <Icons.Sparkles /></>}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-600">
                                        No results yet. Start searching!
                                    </div>
                                )}
                            </div>

                            {/* DRAFT COLUMN */}
                            <div className={`bg-[#1E1E1E] rounded-xl border border-gray-800 p-6 min-h-[300px] transition-opacity ${!draft ? 'opacity-50' : 'opacity-100'}`}>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Generated Content</h3>
                                {draft ? (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-xs text-gray-500">Caption</label>
                                                <button onClick={() => copyToClipboard(draft.caption)} className="text-gray-500 hover:text-white"><Icons.Copy /></button>
                                            </div>
                                            <div className="bg-[#121212] p-3 rounded-lg text-sm text-gray-300 border border-gray-800">{draft.caption}</div>
                                        </div>

                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">Hashtags</label>
                                            <div className="flex flex-wrap gap-2">
                                                {draft.hashtags.map(tag => (
                                                    <span key={tag} className="text-xs text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-1 rounded">#{tag}</span>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-xs text-[#FF007F]">Suggested Image Prompt</label>
                                                <button onClick={() => copyToClipboard(draft.imagePrompt)} className="text-gray-500 hover:text-white"><Icons.Copy /></button>
                                            </div>
                                            <div className="bg-[#121212] p-3 rounded-lg text-sm text-gray-300 italic border border-gray-800 mb-4">{draft.imagePrompt}</div>
                                            
                                            <button 
                                                onClick={handleSendToStudio}
                                                className="w-full py-3 border border-[#FF007F] text-[#FF007F] hover:bg-[#FF007F] hover:text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                                            >
                                                Create This Image <Icons.Image />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-600">
                                        Draft will appear here...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* STUDIO VIEW */}
                {currentView === 'STUDIO' && (
                    <div className="h-full flex flex-col lg:flex-row">
                        {/* CONTROLS PANEL */}
                        <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-r border-gray-800 bg-[#1E1E1E] p-6 overflow-y-auto">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                {studioMode === 'GENERATE' ? 'Image Generator' : 'Magic Editor'}
                                <span className="text-xs font-normal px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                                    {studioMode === 'GENERATE' ? 'Gemini 3 Pro' : 'Gemini 2.5 Flash'}
                                </span>
                            </h2>

                            {studioMode === 'GENERATE' ? (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Image Prompt</label>
                                        <textarea 
                                            value={imagePrompt}
                                            onChange={(e) => setImagePrompt(e.target.value)}
                                            className="w-full h-32 bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-[#FF007F] transition-colors resize-none"
                                            placeholder="Describe the image you want to create..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Aspect Ratio</label>
                                            <select 
                                                value={aspectRatio}
                                                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                                                className="w-full bg-[#121212] border border-gray-700 rounded-lg p-2 text-sm focus:border-[#FF007F] outline-none"
                                            >
                                                <option value="1:1">Square (1:1)</option>
                                                <option value="16:9">Landscape (16:9)</option>
                                                <option value="9:16">Portrait (9:16)</option>
                                                <option value="4:3">Standard (4:3)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Resolution</label>
                                            <select 
                                                value={resolution}
                                                onChange={(e) => setResolution(e.target.value as ImageResolution)}
                                                className="w-full bg-[#121212] border border-gray-700 rounded-lg p-2 text-sm focus:border-[#FF007F] outline-none"
                                            >
                                                <option value="1K">Standard (1K)</option>
                                                <option value="2K">High (2K)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleGenerateImage}
                                        disabled={isGeneratingImg || !imagePrompt}
                                        className="w-full py-4 bg-gradient-to-r from-[#FF007F] to-[#d9006c] hover:brightness-110 rounded-lg font-bold shadow-lg shadow-pink-900/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isGeneratingImg ? <Icons.Loader /> : "Generate Asset"}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* EDIT CONTROLS */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Upload Source Image</label>
                                        <div 
                                            className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center hover:border-[#00E5FF] hover:bg-[#00E5FF]/5 transition-colors cursor-pointer"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                            />
                                            {editFile ? (
                                                <div className="text-[#00E5FF] font-medium truncate">{editFile.name}</div>
                                            ) : (
                                                <div className="text-gray-500 text-sm">Click to upload image</div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Edit Instruction</label>
                                        <textarea 
                                            value={editInstruction}
                                            onChange={(e) => setEditInstruction(e.target.value)}
                                            className="w-full h-32 bg-[#121212] border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-[#00E5FF] transition-colors resize-none"
                                            placeholder="e.g. 'Add a neon sign', 'Make it black and white', 'Remove the background'..."
                                        />
                                    </div>

                                    <button 
                                        onClick={handleEditImage}
                                        disabled={isEditing || !editFile}
                                        className="w-full py-4 bg-[#00E5FF] hover:bg-[#00cce6] text-black rounded-lg font-bold shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isEditing ? <Icons.Loader /> : "Apply Edits"}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* PREVIEW CANVAS */}
                        <div className="flex-1 bg-[#121212] relative flex items-center justify-center p-8 overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1e1e1e_1px,transparent_1px)] bg-[length:20px_20px] opacity-20"></div>
                            
                            {studioMode === 'GENERATE' ? (
                                generatedImage ? (
                                    <div className="relative group max-w-full max-h-full shadow-2xl">
                                        <img src={generatedImage} alt="Generated" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
                                        <a 
                                            href={generatedImage} 
                                            download="decko-generated.png"
                                            className="absolute bottom-4 right-4 bg-white text-black px-4 py-2 rounded-lg font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 hover:bg-gray-200"
                                        >
                                            <Icons.Download /> Download
                                        </a>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-600">
                                        <div className="w-20 h-20 border-2 border-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Icons.Sparkles />
                                        </div>
                                        <p>Your creation will appear here.</p>
                                    </div>
                                )
                            ) : (
                                <div className="flex gap-4 w-full h-full items-center justify-center">
                                    {editPreview && (
                                        <div className="relative max-w-[45%]">
                                            <div className="absolute -top-8 left-0 text-xs text-gray-500 font-mono">ORIGINAL</div>
                                            <img src={editPreview} className="max-h-[70vh] rounded-lg border border-gray-800" />
                                        </div>
                                    )}
                                    
                                    {isEditing && (
                                         <div className="flex flex-col items-center justify-center">
                                             <Icons.Loader />
                                         </div>
                                    )}

                                    {editedImage && (
                                        <div className="relative max-w-[45%] group">
                                            <div className="absolute -top-8 left-0 text-xs text-[#00E5FF] font-mono">EDITED</div>
                                            <img src={editedImage} className="max-h-[70vh] rounded-lg shadow-[0_0_30px_rgba(0,229,255,0.2)]" />
                                            <a 
                                                href={editedImage} 
                                                download="decko-edited.png"
                                                className="absolute bottom-4 right-4 bg-white text-black px-4 py-2 rounded-lg font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 hover:bg-gray-200"
                                            >
                                                <Icons.Download /> Download
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
