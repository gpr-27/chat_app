import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User } from "lucide-react";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  return (
    <div className="app-bg min-h-screen px-4 pb-16 pt-24">
      <div className="blobs" aria-hidden="true" />

      <div className="mx-auto max-w-lg animate-fade-in-up">
        <div className="glass-card rounded-3xl overflow-hidden">

          {/* Gradient banner strip */}
          <div
            className="relative h-36"
            style={{
              background:
                "linear-gradient(135deg, #c4b8fc 0%, #ffc3ae 50%, #a8f0dc 100%)",
            }}
          >
            {/* Soft decorative blobs inside the banner */}
            <div
              className="absolute -left-6 -top-6 size-32 rounded-full opacity-40 blur-2xl"
              style={{ background: "#7C6CF0" }}
              aria-hidden="true"
            />
            <div
              className="absolute -right-4 -bottom-4 size-24 rounded-full opacity-30 blur-2xl"
              style={{ background: "#FF9E80" }}
              aria-hidden="true"
            />
          </div>

          {/* Avatar overlapping the banner */}
          <div className="-mt-14 flex flex-col items-center px-6">
            <div className="relative">
              <img
                src={selectedImg || authUser?.profilePic || "/avatar.png"}
                alt="Profile"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/avatar.png";
                }}
                className="size-28 rounded-full object-cover ring-4 ring-base-100 shadow-lg"
              />
              <label
                htmlFor="avatar-upload"
                className={`btn-grad absolute bottom-1 right-1 grid size-9 cursor-pointer place-items-center rounded-full shadow-lg transition-transform hover:scale-105 ${
                  isUpdatingProfile ? "pointer-events-none animate-pulse" : ""
                }`}
              >
                <Camera className="size-4 text-white" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUpdatingProfile}
                />
              </label>
            </div>

            <h1 className="mt-4 font-display text-2xl font-bold text-base-content">
              {authUser?.fullName}
            </h1>
            <p className="mt-1 text-sm text-base-content/55">
              {isUpdatingProfile ? "Uploading…" : "Tap the camera to update your photo"}
            </p>
          </div>

          {/* Detail rows */}
          <div className="space-y-4 p-6 pt-5">

            {/* Full name field */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/55">
                <User className="size-3.5" />
                Full name
              </div>
              <div className="glass flex items-center rounded-2xl border border-base-content/10 bg-base-200/60 px-4 py-3 font-medium text-base-content shadow-sm">
                {authUser?.fullName}
              </div>
            </div>

            {/* Email field */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/55">
                <Mail className="size-3.5" />
                Email address
              </div>
              <div className="glass flex items-center rounded-2xl border border-base-content/10 bg-base-200/60 px-4 py-3 font-medium text-base-content shadow-sm">
                {authUser?.email}
              </div>
            </div>

            {/* Account sub-card */}
            <div className="glass rounded-2xl border border-base-content/10 bg-base-200/40 p-5 shadow-sm">
              <h2 className="mb-3 font-display text-base font-bold text-base-content">
                Account
              </h2>
              <div className="space-y-0 text-sm">
                <div className="flex items-center justify-between border-b border-base-content/10 pb-3">
                  <span className="text-base-content/60">Member since</span>
                  <span className="font-semibold text-base-content">
                    {authUser?.createdAt?.split("T")[0]}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3">
                  <span className="text-base-content/60">Status</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-success">
                    <span className="size-2 rounded-full bg-success shadow-sm" />
                    Active
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
