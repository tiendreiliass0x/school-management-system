# School Management System SaaS

A comprehensive school management system built with **Bun + Hono** backend and **Next.js** frontend.

## ✨ Features

### **Multi-Role Support**
- **Super Admin**: Manage all schools and global system settings
- **School Admin**: Manage users and classes within their school
- **Teacher**: Manage assigned classes, grades, and assignments  
- **Student**: View classes, grades, and assignments
- **Parent**: View child's academic information

### **Core Functionality**
- 🏫 **School Management**: Create and manage multiple schools
- 👥 **User Management**: Add users with role-based permissions
- 📚 **Class Management**: Create classes and manage enrollments
- 📝 **Assignment & Grading System**: Create assignments and grade students
- 📊 **Attendance Tracking**: Track student attendance
- 🔐 **Authentication**: JWT-based auth with role-based access control

## 🚀 Quick Start

### **Prerequisites**
- **Node.js** 18+ 
- **Bun** runtime
- **Docker** & **Docker Compose** (for PostgreSQL)

### **1. Clone & Install**
```bash
git clone <repository-url>
cd school-management-saas

# Install backend dependencies
cd backend
bun install

# Install frontend dependencies  
cd ../frontend
npm install
```

### **2. Start Database**
```bash
# From backend directory
cd backend
docker-compose up -d
```

### **3. Setup Database Schema**
```bash
# From backend directory
bun run db:push
```

### **4. Start Backend Server**
```bash
# From backend directory  
bun run dev
```

### **5. Start Frontend**
```bash
# From frontend directory
cd ../frontend
npm run dev
```

## 🌐 Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000

### **Demo Accounts**
After creating a school and users through the UI, you can use these demo credentials:

- **Super Admin**: `admin@school.com` / `password`
- **School Admin**: `schooladmin@school.com` / `password`  
- **Teacher**: `teacher@school.com` / `password`
- **Student**: `student@school.com` / `password`

## 📋 Getting Started Workflow

1. **Access the login page** at http://localhost:3000
2. **Create a Super Admin account** (first user becomes super admin)
3. **Login as Super Admin**
4. **Create a school** via Schools → Add School
5. **Add users to the school** via Users → Add User
6. **Create classes** and manage enrollments
7. **Set up academic years, assignments, and grades**

## 🏗️ System Architecture

### **Backend Stack**
- **Runtime**: Bun
- **Framework**: Hono (fast web framework)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Zod schemas

### **Frontend Stack**  
- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with Heroicons
- **State Management**: React Context API
- **HTTP Client**: Custom API client with fetch

### **Database Schema**
```
schools -> users -> classes -> enrollments
                 -> assignments -> grades
                 -> attendance
```

## 📁 Project Structure

```
├── backend/
│   ├── src/
│   │   ├── db/           # Database schema and connection
│   │   ├── routes/       # API route handlers
│   │   ├── middleware/   # Authentication middleware
│   │   └── lib/          # Utilities and auth helpers
│   ├── drizzle/          # Database migrations
│   └── index.ts          # Server entry point
│
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js app directory
│   │   ├── components/   # Reusable UI components
│   │   ├── contexts/     # React contexts
│   │   └── lib/          # API client and utilities
│   └── public/           # Static assets
│
├── docker-compose.yml    # PostgreSQL database setup
└── README.md
```

## 🔧 Development Commands

### **Backend**
```bash
cd backend

# Development server with hot reload
bun run dev

# Database operations
bun run db:generate    # Generate migrations
bun run db:push       # Push schema to database  
bun run db:studio     # Open Drizzle studio

# Production
bun run start
```

### **Frontend**
```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build
npm run start

# Linting
npm run lint
```

## 🔐 Environment Configuration

### **Backend (.env)**
```bash
PORT=8000
DATABASE_URL=postgresql://postgres:password@localhost:5432/school_management
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=development
```

### **Frontend (.env.local)**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🚧 Roadmap

- [ ] **Advanced Grading**: Weighted grade categories, GPA calculation
- [ ] **Parent Portal**: Parent accounts with child progress visibility
- [ ] **Real-time Notifications**: WebSocket-based notifications
- [ ] **File Uploads**: Assignment submissions and document storage
- [ ] **Analytics Dashboard**: Academic performance analytics
- [ ] **Mobile App**: React Native companion app
- [ ] **Multi-language Support**: Internationalization (i18n)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ using Bun, Hono, Next.js, and TypeScript**