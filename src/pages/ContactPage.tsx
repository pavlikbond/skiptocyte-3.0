import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formSubmitUrl } from "@/lib/firebase";

export function ContactPage() {
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const sentHeadingRef = useRef<HTMLHeadingElement>(null);
  const commentInvalid = status === "error" && error === "Comment is required.";
  const emailInvalid = status === "error" && error.startsWith("Enter a valid email");

  useEffect(() => {
    if (status === "ok") sentHeadingRef.current?.focus();
  }, [status]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setStatus("error");
      setError("Comment is required.");
      commentRef.current?.focus();
      return;
    }
    if (email.trim() && emailRef.current && !emailRef.current.validity.valid) {
      setStatus("error");
      setError("Enter a valid email, or leave it blank.");
      emailRef.current.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(formSubmitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, comment, _subject: "Skiptocyte contact" }),
      });
      if (!res.ok) throw new Error("Request failed");
      setComment("");
      setStatus("ok");
    } catch {
      setStatus("error");
      setError("Could not send. Try again later.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="contact-page">
      <header className="contact-page-head">
        <h1>Contact</h1>
        <p>
          A bug, an idea, or a note from the bench. Email is optional — include it if you want a
          reply.
        </p>
      </header>

      {status === "ok" ? (
        <section className="contact-card contact-sent" aria-live="polite">
          <h2 ref={sentHeadingRef} tabIndex={-1}>
            Message sent
          </h2>
          <p>
            Thanks. Your message was sent.
            {email.trim() ? " A reply can go to the address you left." : ""}
          </p>
          <div className="contact-sent-actions">
            <Button asChild>
              <Link to="/differential">Back to counter</Link>
            </Button>
            <Button type="button" variant="outline" onClick={() => setStatus("idle")}>
              Send another
            </Button>
          </div>
        </section>
      ) : (
        <form
          className="contact-card"
          onSubmit={(e) => void submit(e)}
          aria-busy={busy}
          noValidate
        >
          <div className="contact-field">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              ref={emailRef}
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              disabled={busy}
              aria-invalid={emailInvalid}
              aria-describedby={
                emailInvalid ? "contact-email-hint contact-error" : "contact-email-hint"
              }
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === "error") setStatus("idle");
              }}
            />
            <p id="contact-email-hint" className="contact-hint">
              Optional. Used only to reply.
            </p>
          </div>
          <div className="contact-field">
            <Label htmlFor="contact-comment">Comment</Label>
            <Textarea
              ref={commentRef}
              id="contact-comment"
              name="comment"
              required
              rows={8}
              value={comment}
              disabled={busy}
              placeholder="What broke, what you need, or what you wish it did."
              aria-invalid={commentInvalid}
              aria-describedby={commentInvalid ? "contact-error" : undefined}
              onChange={(e) => {
                setComment(e.target.value);
                if (status === "error") setStatus("idle");
              }}
            />
          </div>
          {status === "error" ? (
            <p id="contact-error" className="contact-error" role="alert">
              {error}
            </p>
          ) : null}
          <Button className="contact-send" type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send message"}
          </Button>
        </form>
      )}

      <aside className="contact-support">
        <p>Skiptocyte stays free. If it saved a shift, a coffee helps.</p>
        <Button variant="coffee" size="sm" asChild>
          <a href="https://buymeacoffee.com/pashko" target="_blank" rel="noreferrer">
            Buy me a coffee
          </a>
        </Button>
      </aside>
    </div>
  );
}
