# Deployment Guide: PLSNHS Enrollment System

**Project:** Placido L. Señor National High School - PLSNHS Enrollment System  
**Platform:** Vercel (Production Static & Edge Network)  
**Framework:** React 19 + TypeScript + Vite 5  
**Repository:** `https://github.com/Mangila4k/CapstonewebFinal.git` (Branch: `master`)  
**Backend & Database:** Supabase (`hiraya-enrollment-system`)

---

## 1. Architecture & Technology Stack

The **PLSNHS Enrollment System** is built with **React + TypeScript + Vite**:
- **Application Logic:** 100% typed with TypeScript (`.tsx` and `.ts`), ensuring robust type safety for all portals (Admin, Teacher, Student, Registrar, Guidance, Parents, Public).
- **Compilation & Bundling:** Handled by Vite and TypeScript (`tsc -b && vite build`), compiling the TypeScript codebase into high-performance, minified production assets in the `dist/` folder.
- **Entry Point:** [index.html](file:///c:/Users/mylen/OneDrive/Documents/CAPSWEB/CAPSTONEWEB/index.html) in the project root, which mounts [src/main.tsx](file:///c:/Users/mylen/OneDrive/Documents/CAPSWEB/CAPSTONEWEB/src/main.tsx).
- **Routing:** Handled client-side by `react-router-dom` with SPA rewrites configured in `vercel.json`.

> [!NOTE]
> You do **not** need to write plain HTML pages. Writing your application in **TypeScript (`.tsx`)** is the standard, modern React approach. During deployment, Vercel automatically runs the build command to compile your TypeScript code into production web assets.

---

## 2. Vercel Configuration Settings for `placido-enrollment`

When creating or configuring your project on Vercel:

| Setting | Recommended Value | Description |
| :--- | :--- | :--- |
| **Framework Preset** | **Vite** | Automatically configures build and output directories. |
| **Root Directory** | `./` | Project lives in the repository root. |
| **Build Command** | `npm run build` | Runs `tsc -b && vite build`. |
| **Output Directory** | `dist` | The folder where Vite emits the compiled production build. |
| **Install Command** | `npm install` | Installs project dependencies. |

---

## 3. Environment Variables (Vercel Project Settings)

In the Vercel Dashboard, go to **Settings** > **Environment Variables** and add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `VITE_SUPABASE_PROJECT_NAME` | `hiraya-enrollment-system` | Supabase Project Name |
| `VITE_SUPABASE_PROJECT_ID` | `tuujlqrfyuazvbvoribz` | Supabase Project ID |
| `VITE_SUPABASE_URL` | `https://tuujlqrfyuazvbvoribz.supabase.co` | Supabase Project API URL |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_dYaVB2zNcNNj5gwjzJ4ZRw_N55Djq0D` | Supabase Public Publishable Anon Key |

*(Note: Safe built-in fallbacks are also bundled directly into `src/lib/supabase.ts`, ensuring live database connectivity even if environment variables are not yet entered).*

---

## 4. Single-Page Application (SPA) Routing Rule (`vercel.json`)

To allow client-side routing (e.g. `/student/grades`, `/admin/dashboard`, `/teacher/classes`) to reload without 404 errors, [vercel.json](file:///c:/Users/mylen/OneDrive/Documents/CAPSWEB/CAPSTONEWEB/vercel.json) routes incoming requests to `/index.html`:

```json
{
  "rewrites": [
    {
      "source": "/((?!assets/|pictures/|favicon\\.ico).*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 5. Automated Continuous Deployment (CI/CD)

Whenever you commit and push to `master`:
```powershell
git add .
git commit -m "update message"
git push origin master
```
Vercel automatically detects the push, runs `npm install`, runs `npm run build`, and updates your live URL (e.g., `https://placido-enrollment.vercel.app`) in seconds.
