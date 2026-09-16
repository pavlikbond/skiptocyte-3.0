import { doc, getDoc, setDoc } from "firebase/firestore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import { db } from "@/lib/firebase";
import { liveToDb, saveLocalPresets, saveSoundSettings } from "@/lib/storage";
import type { Preset, SoundSettings, UserDoc } from "@/lib/types";

export function useUserDoc() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["userDoc", user?.uid],
    enabled: Boolean(user?.uid),
    queryFn: async () => {
      const snap = await getDoc(doc(db, "users", user!.uid));
      return (snap.data() ?? {}) as UserDoc;
    },
  });
}

export function useSaveCloudPresets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { presets: Preset[]; includeEmail?: boolean }) => {
      saveLocalPresets(input.presets);
      if (!user) return;
      const payload: UserDoc = { presets: liveToDb(input.presets) };
      if (input.includeEmail && user.email) payload.email = user.email;
      await setDoc(doc(db, "users", user.uid), payload, { merge: true });
    },
    onSuccess: () => {
      if (user) void queryClient.invalidateQueries({ queryKey: ["userDoc", user.uid] });
    },
  });
}

export function useSaveCloudSounds() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (soundSettings: SoundSettings) => {
      saveSoundSettings(soundSettings);
      if (!user) return;
      await setDoc(
        doc(db, "users", user.uid),
        { tableSettings: { soundSettings } },
        { merge: true },
      );
    },
    onSuccess: () => {
      if (user) void queryClient.invalidateQueries({ queryKey: ["userDoc", user.uid] });
    },
  });
}
