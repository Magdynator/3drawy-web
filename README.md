# Adrawya - Community Management System

Adrawya is a sophisticated community management platform designed for modern organizations. It provides a centralized dashboard for managing members, tracking attendance, rewarding participation with points, and organizing events.

![Adrawya Dashboard Logo](public/logo.jpg)

## 🌟 Key Features

### 📊 Comprehensive Dashboard
- **Real-time Analytics**: Monitor community growth and active members.
- **Interactive Calendar**: Full-width community events calendar powered by `date-fns`.
- **Admin Oversight**: Dedicated management cards for super administrators.

### 👥 Member Management
- **User Profiles**: Beautifully crafted profile pages for every member featuring QR codes and barcodes.
- **Points System**: Reward member participation with a dynamic points system.
- **Search & Filter**: Find members instantly with a high-performance search interface.
- **ATM Mode**: Secure "ATM-style" interface for self-service interactions using PINs.

### 🛡️ Secure Administration
- **Role-Based Access Control (RBAC)**: Distinct permissions for `Super Admin` and `Admin` users.
- **Credential Management**: Securely manage administrator emails and passwords via encrypted RPC functions.

### 📱 Advanced Capabilities
- **Integrated Scanner**: Built-in QR and Barcode scanner for automated attendance marking and point verification.
- **Community Games**: Interactive features like Bingo Draw for engagement.
- **Dark Mode Support**: Aesthetic and accessible dark/light theme switching.

## 🚀 Tech Stack

- **Frontend**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Data Fetching**: TanStack Query (React Query)
- **Icons**: Lucide React
- **Animations**: Framer Motion

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm or bun

### Local Development

1. **Clone the repository**:
   ```sh
   git clone <repository-url>
   cd adrawya
   ```

2. **Install dependencies**:
   ```sh
   npm install
   ```

3. **Environment Variables**:
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**:
   ```sh
   npm run dev
   ```

## 📂 Project Structure

- `src/components`: UI components and domain-specific reusable blocks.
- `src/pages`: Main application views (Dashboard, Management, Scanner, etc.).
- `src/contexts`: Global state management (Authentication, Themes).
- `src/hooks`: Custom React hooks for shared logic.
- `supabase/migrations`: Database schema and secure RPC functions.

## 📄 License

This project is licensed under the MIT License.
