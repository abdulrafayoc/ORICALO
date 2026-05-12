/**
 * Demo Fixtures — plays back a scripted voice session without a real microphone.
 * Used for investor demos and presentations via the "Run Demo" button on the console.
 */

export interface DemoEvent {
  /** Milliseconds from the previous event (NOT from session start) */
  delay: number;
  type: string;
  payload: Record<string, unknown>;
}

export const DEMO_SCRIPT: DemoEvent[] = [
  {
    delay: 600,
    type: "status",
    payload: { status: "listening", message: "Listening..." },
  },
  {
    delay: 1800,
    type: "transcript",
    payload: {
      text: "DHA Phase 5",
      is_final: false,
      speaker: "user",
    },
  },
  {
    delay: 600,
    type: "transcript",
    payload: {
      text: "DHA Phase 5 mein 5 marla ghar chahiye",
      is_final: true,
      speaker: "user",
    },
  },
  {
    delay: 300,
    type: "status",
    payload: { status: "processing", message: "Thinking..." },
  },
  {
    delay: 1400,
    type: "actions",
    payload: {
      actions: [
        {
          type: "show_listings",
          payload: {
            listings: [
              {
                id: "demo-1",
                title: "5 Marla House — DHA Phase 5 Block L",
                location: "DHA Phase 5, Lahore",
                price: "3.2 Crore PKR",
                image: "",
                bedrooms: 3,
                baths: 3,
                area: "5 Marla",
              },
              {
                id: "demo-2",
                title: "5 Marla Corner House — DHA Phase 5",
                location: "DHA Phase 5, Lahore",
                price: "3.8 Crore PKR",
                image: "",
                bedrooms: 4,
                baths: 3,
                area: "5 Marla",
              },
              {
                id: "demo-3",
                title: "5 Marla New Build — DHA Phase 5 Block M",
                location: "DHA Phase 5, Lahore",
                price: "4.1 Crore PKR",
                image: "",
                bedrooms: 4,
                baths: 4,
                area: "5 Marla",
              },
            ],
          },
        },
      ],
    },
  },
  {
    delay: 200,
    type: "status",
    payload: { status: "speaking", message: "Speaking..." },
  },
  {
    delay: 100,
    type: "transcript",
    payload: {
      text: "Ji zaroor! DHA Phase 5 mein 5 marla ke teen ghar available hain — 3.2 crore se 4.1 crore tak. Main ne unki details screen par dikhadi hain.",
      is_final: true,
      speaker: "agent",
    },
  },
  {
    delay: 4000,
    type: "status",
    payload: { status: "listening", message: "Listening..." },
  },
  {
    delay: 2200,
    type: "transcript",
    payload: {
      text: "Qeemat thori aur batao",
      is_final: true,
      speaker: "user",
    },
  },
  {
    delay: 300,
    type: "status",
    payload: { status: "processing", message: "Thinking..." },
  },
  {
    delay: 1200,
    type: "actions",
    payload: {
      actions: [
        {
          type: "show_price",
          payload: {
            min_price: 32000000,
            max_price: 41000000,
            confidence: 0.87,
            currency: "PKR",
          },
        },
      ],
    },
  },
  {
    delay: 200,
    type: "status",
    payload: { status: "speaking", message: "Speaking..." },
  },
  {
    delay: 100,
    type: "transcript",
    payload: {
      text: "Market analysis ke mutabiq DHA Phase 5 mein 5 marla ghar ki average qeemat 3.2 crore se 4.1 crore ke darmiyan hai. Confidence level 87% hai.",
      is_final: true,
      speaker: "agent",
    },
  },
  {
    delay: 4500,
    type: "status",
    payload: { status: "listening", message: "Listening..." },
  },
];

/**
 * Runs the demo script, calling `onMessage` for each event after its delay.
 * Returns a cancel function — call it to abort the demo mid-playback.
 */
export function runDemoSession(
  onMessage: (msg: { type: string; [key: string]: unknown }) => void
): () => void {
  let cancelled = false;
  const timeouts: ReturnType<typeof setTimeout>[] = [];

  let elapsed = 0;
  for (const event of DEMO_SCRIPT) {
    elapsed += event.delay;
    const t = setTimeout(() => {
      if (cancelled) return;
      onMessage({ type: event.type, ...event.payload });
    }, elapsed);
    timeouts.push(t);
  }

  return () => {
    cancelled = true;
    timeouts.forEach(clearTimeout);
  };
}
