"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Check, Save, Atom } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const TOTAL_STEPS = 10
const stepLabels = ["Personal Info","Company Info","Branding","Knowledge Base","Multimodal Usage","Channels","AI Agents","Automation","Analytics","Dashboard"]

interface FormData {
  fullName:string; position:string; email:string; mobile:string; country:string; preferredLanguage:string; secondaryLanguages:string; commsChannels:string[];
  companyName:string; industry:string; subIndustry:string; yearsInBusiness:string; numEmployees:string; companyWebsite:string; socialMedia:string; businessDescription:string; mainProducts:string; topChallenges:string; topGoals:string;
  brandName:string; tagline:string; brandPersonality:string[]; primaryColor:string; primaryColorCode:string; secondaryColor:string; secondaryColorCode:string; accentColor:string; accentColorCode:string; backgroundPref:string[]; preferredTypography:string; brandAssets:string[];
  knowledgeTypes:string[]; estimatedFiles:string; estimatedStorage:string; updateFrequency:string[];
  textDocsPdf:string; textEmail:string; textSupport:string; textResearch:string; imgMarketing:string; imgProduct:string; imgAiGen:string; imgAvatar:string; imgAnalysis:string; audioVoiceNotes:string; audioTranscription:string; audioTranslation:string; audioDubbing:string; videoCreation:string; videoAnalysis:string; videoTraining:string;
  commsWhatsapp:string; commsTelegram:string; commsEmail:string; commsWebsiteChat:string; commsPhone:string;
  aiAgents:string[]; numAgentsRequired:string;
  automation:string[];
  avgDocsMonthly:string; avgConversations:string; avgResearch:string; avgImages:string; avgAudioMinutes:string; avgTeamUsers:string; expectedGrowth:string;
  dashboardMetrics:string[]; estimatedHoursSaved:string; additionalNotes:string;
}

const initialForm: FormData = {
  fullName:"",position:"",email:"",mobile:"",country:"",preferredLanguage:"",secondaryLanguages:"",commsChannels: [],
  companyName:"",industry:"",subIndustry:"",yearsInBusiness:"",numEmployees:"",companyWebsite:"",socialMedia:"",businessDescription:"",mainProducts:"",topChallenges:"",topGoals:"",
  brandName:"",tagline:"",brandPersonality: [],primaryColor:"",primaryColorCode:"",secondaryColor:"",secondaryColorCode:"",accentColor:"",accentColorCode:"",backgroundPref: [],preferredTypography:"",brandAssets: [],
  knowledgeTypes: [],estimatedFiles:"",estimatedStorage:"",updateFrequency: [],
  textDocsPdf:"",textEmail:"",textSupport:"",textResearch:"",imgMarketing:"",imgProduct:"",imgAiGen:"",imgAvatar:"",imgAnalysis:"",audioVoiceNotes:"",audioTranscription:"",audioTranslation:"",audioDubbing:"",videoCreation:"",videoAnalysis:"",videoTraining:"",
  commsWhatsapp:"",commsTelegram:"",commsEmail:"",commsWebsiteChat:"",commsPhone:"",
  aiAgents: [],numAgentsRequired:"",
  automation: [],
  avgDocsMonthly:"",avgConversations:"",avgResearch:"",avgImages:"",avgAudioMinutes:"",avgTeamUsers:"",expectedGrowth:"",
  dashboardMetrics: [],estimatedHoursSaved:"",additionalNotes:"",
}

function CB({opts,sel,onChange,c=1}:{opts:string[];sel:string[];onChange:(v:string[])=>void;c?:number}){
  const toggle=(val:string)=>onChange(sel.includes(val)?sel.filter(v=>v!==val):[...sel,val])
  return <div className={cn("grid gap-2",c===2?"grid-cols-2":c===3?"grid-cols-2 md:grid-cols-3":"grid-cols-1")}>{opts.map(o=><label key={o} className="flex cursor-pointer items-center gap-2 rounded-md border p-2 transition-colors hover:bg-accent"><input type="checkbox" checked={sel.includes(o)} onChange={()=>toggle(o)} className="h-4 w-4 rounded border-muted-foreground accent-emerald-500"/><span className="text-sm">{o}</span></label>)}</div>
}

function RG({opts,value,onChange,label}:{opts:string[];value:string;onChange:(v:string)=>void;label:string}){
  return <div className="space-y-1"><span className="text-sm font-medium text-foreground">{label}</span><div className="flex gap-2">{opts.map(o=><label key={o} className={cn("flex-1 cursor-pointer rounded-md border px-3 py-2 text-center text-xs font-medium transition-colors",value===o?"border-emerald-500 bg-emerald-500/10 text-emerald-400":"hover:bg-accent")}><input type="radio" name={label} value={o} checked={value===o} onChange={()=>onChange(o)} className="sr-only"/>{o}</label>)}</div></div>
}

function F({label,children,cn:className}:{label:string;children:React.ReactNode;cn?:string}){
  return <div className={cn("space-y-1.5",className)}><Label className="text-sm font-medium">{label}</Label>{children}</div>
}

function TA({value,onChange,placeholder}:{value:string;onChange:(v:string)=>void;placeholder:string}){
  return <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>
}

export function ExploroOnboardingForm(){
  const [step,setStep]=useState(1)
  const [form,setForm]=useState<FormData>(initialForm)
  const router = useRouter()
  const [submitted,setSubmitted]=useState(false)
  const upd=<K extends keyof FormData>(k:K,v:FormData[K])=>setForm(p=>({...p,[k]:v}))
  const next=()=>setStep(s=>Math.min(s+1,TOTAL_STEPS))
  const prev=()=>setStep(s=>Math.max(s-1,1))

  if(submitted) return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20"><Check className="h-8 w-8 text-emerald-400"/></div>
        <h1 className="text-2xl font-bold">Thank You!</h1>
        <p className="text-muted-foreground">Your Exploro AI onboarding form has been submitted successfully. Our team will review your requirements and reach out shortly.</p>
        <Button onClick={()=>{setStep(1);setForm(initialForm);setSubmitted(false)}} variant="outline">Submit Another</Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-emerald-950/30 to-background">
      <div className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-lime-500"><Atom className="h-6 w-6 text-white"/></div>
            <div><h1 className="text-lg font-bold leading-tight tracking-tight">EXPLORO</h1><p className="text-xs text-muted-foreground">Client Discovery & Onboarding</p></div>
          </div>
          <div className="text-sm text-muted-foreground">Step {step} of {TOTAL_STEPS}</div>
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-gradient-to-r from-emerald-500 to-lime-500 transition-all duration-500" style={{width:`${(step/TOTAL_STEPS)*100}%`}}/></div>
          <div className="mt-2 hidden text-xs text-muted-foreground sm:block">{stepLabels.map((l,i)=><span key={l} className={cn("mr-3",i+1===step?"font-semibold text-emerald-400":i+1<step?"text-emerald-600":"")}>{i+1}. {l}</span>)}</div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          {/* S1 */}
          {step===1&&<div className="space-y-6"><h2 className="text-xl font-semibold">Section 1: Personal Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <F label="Full Name"><Input value={form.fullName} onChange={e=>upd("fullName",e.target.value)} placeholder="Jane Doe"/></F>
              <F label="Position / Title"><Input value={form.position} onChange={e=>upd("position",e.target.value)} placeholder="CEO"/></F>
              <F label="Email Address"><Input type="email" value={form.email} onChange={e=>upd("email",e.target.value)} placeholder="name@company.com"/></F>
              <F label="Mobile Number"><Input value={form.mobile} onChange={e=>upd("mobile",e.target.value)} placeholder="+1 234 567 890"/></F>
              <F label="Country"><Input value={form.country} onChange={e=>upd("country",e.target.value)} placeholder="United States"/></F>
              <F label="Preferred Language"><Input value={form.preferredLanguage} onChange={e=>upd("preferredLanguage",e.target.value)} placeholder="English"/></F>
              <F label="Secondary Languages" cn="sm:col-span-2"><Input value={form.secondaryLanguages} onChange={e=>upd("secondaryLanguages",e.target.value)} placeholder="Spanish, French"/></F>
            </div>
            <div className="space-y-2"><Label className="text-sm font-medium">Preferred Communication Channel</Label><CB opts={["Telegram","WhatsApp","Email","Website Chat","Voice Calls"]} sel={form.commsChannels} onChange={v=>upd("commsChannels",v)} c={3}/></div>
          </div>}

          {/* S2 */}
          {step===2&&<div className="space-y-6"><h2 className="text-xl font-semibold">Section 2: Company Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <F label="Company Name"><Input value={form.companyName} onChange={e=>upd("companyName",e.target.value)}/></F>
              <F label="Industry"><Input value={form.industry} onChange={e=>upd("industry",e.target.value)} placeholder="Technology"/></F>
              <F label="Sub-Industry"><Input value={form.subIndustry} onChange={e=>upd("subIndustry",e.target.value)} placeholder="SaaS"/></F>
              <F label="Years in Business"><Input value={form.yearsInBusiness} onChange={e=>upd("yearsInBusiness",e.target.value)} placeholder="5"/></F>
              <F label="Number of Employees"><Input value={form.numEmployees} onChange={e=>upd("numEmployees",e.target.value)} placeholder="50"/></F>
              <F label="Company Website"><Input value={form.companyWebsite} onChange={e=>upd("companyWebsite",e.target.value)} placeholder="https://..."/></F>
              <F label="Social Media Channels" cn="sm:col-span-2"><Input value={form.socialMedia} onChange={e=>upd("socialMedia",e.target.value)} placeholder="LinkedIn, Twitter"/></F>
              <F label="Business Description" cn="sm:col-span-2"><TA value={form.businessDescription} onChange={v=>upd("businessDescription",v)} placeholder="Briefly describe your business..."/></F>
              <F label="Main Products / Services" cn="sm:col-span-2"><Input value={form.mainProducts} onChange={e=>upd("mainProducts",e.target.value)}/></F>
              <F label="Top 3 Business Challenges" cn="sm:col-span-2"><TA value={form.topChallenges} onChange={v=>upd("topChallenges",v)} placeholder="List your top 3 challenges..."/></F>
              <F label="Top 3 Business Goals" cn="sm:col-span-2"><TA value={form.topGoals} onChange={v=>upd("topGoals",v)} placeholder="List your top 3 goals..."/></F>
            </div>
          </div>}

          {/* S3 */}
          {step===3&&<div className="space-y-6"><h2 className="text-xl font-semibold">Section 3: Branding Profile</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <F label="Brand Name"><Input value={form.brandName} onChange={e=>upd("brandName",e.target.value)}/></F>
              <F label="Tagline"><Input value={form.tagline} onChange={e=>upd("tagline",e.target.value)} placeholder="Your brand tagline..."/></F>
              <div className="sm:col-span-2 space-y-2"><Label className="text-sm font-medium">Brand Personality</Label><CB opts={["Professional","Luxury","Friendly","Technical","Wellness","Educational","Corporate","Creative"]} sel={form.brandPersonality} onChange={v=>upd("brandPersonality",v)} c={4}/></div>
              <F label="Primary Color"><Input value={form.primaryColor} onChange={e=>upd("primaryColor",e.target.value)} placeholder="Navy Blue"/></F>
              <F label="Primary Pantone / HEX"><Input value={form.primaryColorCode} onChange={e=>upd("primaryColorCode",e.target.value)} placeholder="#1E40AF"/></F>
              <F label="Secondary Color"><Input value={form.secondaryColor} onChange={e=>upd("secondaryColor",e.target.value)} placeholder="White"/></F>
              <F label="Secondary Pantone / HEX"><Input value={form.secondaryColorCode} onChange={e=>upd("secondaryColorCode",e.target.value)} placeholder="#FFFFFF"/></F>
              <F label="Accent Color"><Input value={form.accentColor} onChange={e=>upd("accentColor",e.target.value)} placeholder="Lime Green"/></F>
              <F label="Accent Pantone / HEX"><Input value={form.accentColorCode} onChange={e=>upd("accentColorCode",e.target.value)} placeholder="#84CC16"/></F>
              <div className="sm:col-span-2 space-y-2"><Label className="text-sm font-medium">Background Preference</Label><CB opts={["Solid","Gradient"]} sel={form.backgroundPref} onChange={v=>upd("backgroundPref",v)}/></div>
              <F label="Preferred Typography" cn="sm:col-span-2"><Input value={form.preferredTypography} onChange={e=>upd("preferredTypography",e.target.value)} placeholder="Inter, Roboto"/></F>
              <div className="sm:col-span-2 space-y-2"><Label className="text-sm font-medium">Upload Brand Assets</Label><CB opts={["Logo","Brand Guidelines","Marketing Materials"]} sel={form.brandAssets} onChange={v=>upd("brandAssets",v)}/></div>
            </div>
          </div>}

          {/* S4 */}
          {step===4&&<div className="space-y-6"><h2 className="text-xl font-semibold">Section 4: Knowledge Base Assessment</h2>
            <div className="space-y-2"><Label className="text-sm font-medium">What type of information will the AI Agent use?</Label><CB opts={["Documents","PDFs","Excel Files","PowerPoint","Word Documents","Policies","SOPs","Research Papers","Contracts","Product Catalogs","Recipes","Training Manuals","Customer Data","CRM Data"]} sel={form.knowledgeTypes} onChange={v=>upd("knowledgeTypes",v)} c={2}/></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <F label="Estimated Number of Files"><Input value={form.estimatedFiles} onChange={e=>upd("estimatedFiles",e.target.value)} placeholder="500"/></F>
              <F label="Estimated Total Storage Size"><Input value={form.estimatedStorage} onChange={e=>upd("estimatedStorage",e.target.value)} placeholder="10 GB"/></F>
            </div>
            <div className="space-y-2"><Label className="text-sm font-medium">Frequency of Updates</Label><CB opts={["Daily","Weekly","Monthly","Quarterly"]} sel={form.updateFrequency} onChange={v=>upd("updateFrequency",v)}/></div>
          </div>}

          {/* S5 */}
          {step===5&&<div className="space-y-8"><h2 className="text-xl font-semibold">Section 5: Multimodal Usage Profile</h2>
            <div className="space-y-6"><h3 className="text-lg font-medium text-emerald-400">TEXT USAGE</h3><div className="grid gap-4 sm:grid-cols-2">
              <RG label="Documents / PDFs" opts={["Low","Medium","High"]} value={form.textDocsPdf} onChange={v=>upd("textDocsPdf",v)}/>
              <RG label="Email Communication" opts={["Low","Medium","High"]} value={form.textEmail} onChange={v=>upd("textEmail",v)}/>
              <RG label="Customer Support Messages" opts={["Low","Medium","High"]} value={form.textSupport} onChange={v=>upd("textSupport",v)}/>
              <RG label="Research & Analysis" opts={["Low","Medium","High"]} value={form.textResearch} onChange={v=>upd("textResearch",v)}/>
            </div></div>
            <div className="space-y-6"><h3 className="text-lg font-medium text-emerald-400">IMAGE USAGE</h3><div className="grid gap-4 sm:grid-cols-2">
              <RG label="Marketing Graphics" opts={["Low","Medium","High"]} value={form.imgMarketing} onChange={v=>upd("imgMarketing",v)}/>
              <RG label="Product Images" opts={["Low","Medium","High"]} value={form.imgProduct} onChange={v=>upd("imgProduct",v)}/>
              <RG label="AI Image Generation" opts={["Low","Medium","High"]} value={form.imgAiGen} onChange={v=>upd("imgAiGen",v)}/>
              <RG label="AI Agent (Avatar)" opts={["Low","Medium","High"]} value={form.imgAvatar} onChange={v=>upd("imgAvatar",v)}/>
              <RG label="Image Analysis" opts={["Low","Medium","High"]} value={form.imgAnalysis} onChange={v=>upd("imgAnalysis",v)}/>
            </div></div>
            <div className="space-y-6"><h3 className="text-lg font-medium text-emerald-400">AUDIO USAGE</h3><div className="grid gap-4 sm:grid-cols-2">
              <RG label="Voice Notes" opts={["Low","Medium","High"]} value={form.audioVoiceNotes} onChange={v=>upd("audioVoiceNotes",v)}/>
              <RG label="Voice Transcription" opts={["Low","Medium","High"]} value={form.audioTranscription} onChange={v=>upd("audioTranscription",v)}/>
              <RG label="Translation" opts={["Low","Medium","High"]} value={form.audioTranslation} onChange={v=>upd("audioTranslation",v)}/>
              <RG label="Audio Dubbing" opts={["Low","Medium","High"]} value={form.audioDubbing} onChange={v=>upd("audioDubbing",v)}/>
            </div></div>
            <div className="space-y-6"><h3 className="text-lg font-medium text-emerald-400">VIDEO USAGE</h3><div className="grid gap-4 sm:grid-cols-2">
              <RG label="Video Creation" opts={["Low","Medium","High"]} value={form.videoCreation} onChange={v=>upd("videoCreation",v)}/>
              <RG label="Video Analysis" opts={["Low","Medium","High"]} value={form.videoAnalysis} onChange={v=>upd("videoAnalysis",v)}/>
              <RG label="Training Videos" opts={["Low","Medium","High"]} value={form.videoTraining} onChange={v=>upd("videoTraining",v)}/>
            </div></div>
          </div>}

          {/* S6 */}
          {step===6&&<div className="space-y-6"><h2 className="text-xl font-semibold">Section 6: Communication Channels</h2><p className="text-sm text-muted-foreground">Rate your expected communication volume per channel.</p>
            <div className="grid gap-6 sm:grid-cols-2">
              <RG label="WhatsApp" opts={["Low (<100/month)","Medium (100-1000/month)","High (1000+/month)"]} value={form.commsWhatsapp} onChange={v=>upd("commsWhatsapp",v)}/>
              <RG label="Telegram" opts={["Low","Medium","High"]} value={form.commsTelegram} onChange={v=>upd("commsTelegram",v)}/>
              <RG label="Email" opts={["Low","Medium","High"]} value={form.commsEmail} onChange={v=>upd("commsEmail",v)}/>
              <RG label="Website Chat" opts={["Low","Medium","High"]} value={form.commsWebsiteChat} onChange={v=>upd("commsWebsiteChat",v)}/>
              <RG label="Phone Calls" opts={["Low","Medium","High"]} value={form.commsPhone} onChange={v=>upd("commsPhone",v)}/>
            </div>
          </div>}

          {/* S7 */}
          {step===7&&<div className="space-y-6"><h2 className="text-xl font-semibold">Section 7: AI Agent Requirements</h2>
            <div className="space-y-2"><Label className="text-sm font-medium">Which AI Agents would you like?</Label><CB opts={["Customer Service Agent","Sales Agent","Marketing Agent","Research Agent","Knowledge Management Agent","HR Agent","Finance Agent","Operations Agent","Sustainability Agent","Administrational Assistant Agent","Industry-Specific Agent"]} sel={form.aiAgents} onChange={v=>upd("aiAgents",v)} c={2}/></div>
            <F label="Number of Agents Required"><Input value={form.numAgentsRequired} onChange={e=>upd("numAgentsRequired",e.target.value)} placeholder="3"/></F>
          </div>}

          {/* S8 */}
          {step===8&&<div className="space-y-6"><h2 className="text-xl font-semibold">Section 8: Automation Requirements</h2><p className="text-sm text-muted-foreground">Select the processes you would like the AI Agent to automate.</p>
            <CB opts={["Customer Support","Customized CRM System (Full connectivity)","Appointment Scheduling","Lead Qualification","Email Responses","WhatsApp Responses","Social Media Content","Internal Knowledge Search","Reporting","Research Tasks"]} sel={form.automation} onChange={v=>upd("automation",v)} c={2}/>
          </div>}

          {/* S9 */}
          {step===9&&<div className="space-y-6"><h2 className="text-xl font-semibold">Section 9: Analytics Baseline (Optional)</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <F label="Avg Monthly Documents Created"><Input value={form.avgDocsMonthly} onChange={e=>upd("avgDocsMonthly",e.target.value)} placeholder="50"/></F>
              <F label="Avg Monthly Customer Conversations"><Input value={form.avgConversations} onChange={e=>upd("avgConversations",e.target.value)} placeholder="200"/></F>
              <F label="Avg Monthly Research Requests"><Input value={form.avgResearch} onChange={e=>upd("avgResearch",e.target.value)} placeholder="20"/></F>
              <F label="Avg Monthly Images Generated"><Input value={form.avgImages} onChange={e=>upd("avgImages",e.target.value)} placeholder="100"/></F>
              <F label="Avg Monthly Audio Minutes Processed"><Input value={form.avgAudioMinutes} onChange={e=>upd("avgAudioMinutes",e.target.value)} placeholder="300"/></F>
              <F label="Avg Monthly Team Users"><Input value={form.avgTeamUsers} onChange={e=>upd("avgTeamUsers",e.target.value)} placeholder="10"/></F>
            </div>
            <RG label="Expected Growth in 12 Months" opts={["Low","Medium","High"]} value={form.expectedGrowth} onChange={v=>upd("expectedGrowth",v)}/>
          </div>}

          {/* S10 */}
          {step===10&&<div className="space-y-6"><h2 className="text-xl font-semibold">Section 10: Dashboard Metrics</h2>
            <div className="space-y-2"><Label className="text-sm font-medium">What would make the UI/UX clear and successful?</Label>
              <CB opts={["Customer interaction (Threads, follow ups)","Usage Alerts","Improve Customer Service (AI Agent Suggestions based on Business model)","Conversion Rate Monthly Report","Customer Retention Rate","Customer Engagement Response Time","Performance & Engagement Monthly Rate"]} sel={form.dashboardMetrics} onChange={v=>upd("dashboardMetrics",v)}/>
            </div>
            <F label="Estimated Monthly Hours AI Could Save"><Input value={form.estimatedHoursSaved} onChange={e=>upd("estimatedHoursSaved",e.target.value)} placeholder="40"/></F>
            <F label="Additional Notes"><TA value={form.additionalNotes} onChange={v=>upd("additionalNotes",v)} placeholder="Any other requirements or notes..."/></F>
          </div>}

          {/* Nav */}
          <div className="mt-8 flex items-center justify-between border-t pt-6">
            <Button variant="outline" onClick={prev} disabled={step===1} className="gap-1"><ChevronLeft className="h-4 w-4"/>Previous</Button>
            {step<TOTAL_STEPS?(
              <Button onClick={next} className="gap-1 bg-emerald-600 hover:bg-emerald-700">Next<ChevronRight className="h-4 w-4"/></Button>
            ):(
              <Button onClick={()=>{ console.log(form); router.push("/creating") }} className="gap-1 bg-emerald-600 hover:bg-emerald-700"><Save className="h-4 w-4"/>Submit</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
