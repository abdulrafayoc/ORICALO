"use client";

import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardBody, CardFooter, CardMeta } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { StatusDot } from "@/components/ui/status-dot";
import { BrandMark } from "@/components/ui/brand-mark";
import {
  Table, THead, TBody, Tr, Th, Td,
} from "@/components/ui/table";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Ticker } from "@/components/Ticker";
import { Toaster, toast } from "@/components/ui/toast";
import { VoicePresenceProvider, useVoicePresence } from "@/context/voice-presence";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-6 border-b border-border">
      <h2 className="font-serif text-xl mb-4">{title}</h2>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

function VoicePresenceControls() {
  const { setStatus, setAmplitude } = useVoicePresence();
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="ghost" onClick={() => setStatus("idle")}>idle</Button>
      <Button size="sm" variant="ghost" onClick={() => setStatus("listening")}>listening</Button>
      <Button size="sm" variant="ghost" onClick={() => setStatus("thinking")}>thinking</Button>
      <Button size="sm" variant="ghost" onClick={() => { setStatus("speaking"); setAmplitude(0.7); }}>
        speaking
      </Button>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <VoicePresenceProvider>
      <TooltipProvider>
        <div className="max-w-5xl mx-auto px-6 py-8">
          <header className="mb-8">
            <h1 className="font-serif text-3xl">ORICALO Design System</h1>
            <p className="text-muted-foreground text-sm mt-1">
              P1 risk gate. Delete in P5.
            </p>
          </header>

          <Section title="Brand">
            <BrandMark size={32} />
            <BrandMark size={48} pulse />
            <VoicePresenceControls />
          </Section>

          <Section title="Buttons">
            <Button variant="primary">Primary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" disabled>Disabled</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
          </Section>

          <Section title="Badges">
            <Badge>NEUTRAL</Badge>
            <Badge variant="mint">LIVE</Badge>
            <Badge variant="warning">WARN</Badge>
            <Badge variant="danger">ERROR</Badge>
          </Section>

          <Section title="Status dots">
            <StatusDot state="idle" size="xs" />
            <StatusDot state="idle" />
            <StatusDot state="live" />
            <StatusDot state="error" />
          </Section>

          <Section title="Avatars">
            <Avatar name="Huzaifa" />
            <Avatar name="Ahmed Khan" liveDot />
            <Avatar size="lg" name="Saima Iqbal" />
          </Section>

          <Section title="Inputs">
            <Input placeholder="Type here..." />
            <Input placeholder="With icon" leftIcon={<Building2 className="w-4 h-4" />} />
            <Input mono placeholder="LEAD_ID" rightHint="⌘K" />
            <Textarea placeholder="Notes..." />
          </Section>

          <Section title="Tickers">
            <span className="font-serif text-2xl"><Ticker value={247} format="number" /></span>
            <span className="font-serif text-2xl"><Ticker value={1_25_00_000} format="pkr" /></span>
            <span className="font-mono text-base"><Ticker value={9240} format="duration" /></span>
          </Section>

          <Section title="Cards">
            <Card className="w-72">
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <CardMeta>Last 30 min</CardMeta>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-muted-foreground">A short description.</p>
              </CardBody>
              <CardFooter>
                <Button size="sm" variant="ghost">View all</Button>
                <Button size="sm">Action</Button>
              </CardFooter>
            </Card>
            <Card className="w-72" live>
              <CardBody>
                <p className="text-sm">Live card — hover for ring</p>
              </CardBody>
            </Card>
          </Section>

          <Section title="Skeletons">
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-48 h-6" />
            <Skeleton className="w-64 h-24" />
          </Section>

          <Section title="Empty state">
            <EmptyState
              icon={<Building2 className="w-10 h-10" />}
              title="No leads yet"
              description="Once your voice agent qualifies a lead, it will land here."
              action={<Button>Add lead</Button>}
            />
          </Section>

          <Section title="Table">
            <Table>
              <THead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Location</Th>
                  <Th>Value</Th>
                </Tr>
              </THead>
              <TBody>
                <Tr>
                  <Td>Ahmed Khan</Td>
                  <Td>DHA Phase 5</Td>
                  <Td className="font-serif">1 crore 25 lakh</Td>
                </Tr>
                <Tr>
                  <Td>Saima Iqbal</Td>
                  <Td>Bahria Town</Td>
                  <Td className="font-serif">85 lakh</Td>
                </Tr>
              </TBody>
            </Table>
          </Section>

          <Section title="Dialog">
            <Dialog>
              <DialogTrigger asChild>
                <Button>Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm action</DialogTitle>
                  <DialogDescription>This is a description in muted text.</DialogDescription>
                </DialogHeader>
                <p className="text-sm">Body content.</p>
              </DialogContent>
            </Dialog>
          </Section>

          <Section title="Tooltip">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>I am a tooltip</TooltipContent>
            </Tooltip>
          </Section>

          <Section title="Toast">
            <Button onClick={() => toast("Lead qualified", { description: "Lead #1247 · saved" })}>
              Trigger toast
            </Button>
            <Toaster />
          </Section>
        </div>
      </TooltipProvider>
    </VoicePresenceProvider>
  );
}
