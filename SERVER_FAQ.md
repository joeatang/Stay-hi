# 🚀 STAY HI SERVER ISSUES FAQ

## ❓ **"Why does the server keep reverting to the wrong directory?"**

### 🔍 **ROOT CAUSE**:
This is **NOT a Supabase issue** - it's a local development environment issue. Here's why it happens:

### 📊 **THE PROBLEM**:
- **Terminal Working Directory**: When you run `python3 -m http.server 5500`, Python starts the server from your **current terminal directory**
- **IDE Behavior**: VS Code or other IDEs might default to the project root (`/Stay-hi`) instead of the web files location (`/Stay-hi/public`)
- **Manual Navigation**: Easy to forget to `cd public` before starting the server

### 🚫 **WHY IT'S NOT SUPABASE**:
- **Supabase is Cloud-Based**: Supabase runs entirely on their servers
- **Local File Serving**: The Python HTTP server only serves your local files
- **No Connection**: Supabase doesn't control where your local server starts
- **Authentication vs File Serving**: These are completely separate concerns

### ✅ **PERMANENT SOLUTION**:

#### **Option 1: Use Our Bulletproof Script** (RECOMMENDED)
```bash
# From the Stay-hi directory, just run:
./start-server.sh
```
This script:
- ✅ Automatically navigates to the correct directory
- ✅ Kills any existing servers
- ✅ Verifies files exist before starting
- ✅ Shows clear status messages
- ✅ **NEVER fails due to directory issues**

#### **Option 2: Manual Method**
```bash
# Always remember these steps:
cd /Users/joeatang/Documents/GitHub/Stay-hi/public
python3 -m http.server 5500
```

#### **Option 3: Add to Your Shell Profile**
```bash
# Add this alias to ~/.zshrc or ~/.bash_profile
alias stayhi='cd /Users/joeatang/Documents/GitHub/Stay-hi/public && python3 -m http.server 5500'
```

## 🔧 **TROUBLESHOOTING GUIDE**:

### **If you get 404 errors:**
1. ✅ Check the server output - look for "Current directory:"
2. ✅ If it shows `/Stay-hi` instead of `/Stay-hi/public`, restart with our script
3. ✅ Use `./start-server.sh` instead of manual commands

### **If port 5500 is busy:**
```bash
# Kill any process using port 5500
lsof -ti:5500 | xargs kill -9
```

### **If files seem missing:**
```bash
# Verify files exist in public directory
ls -la /Users/joeatang/Documents/GitHub/Stay-hi/public/*.html
```

## 🚀 **KEY TAKEAWAYS**:

1. **NOT A CODE ISSUE**: The Stay Hi authentication system is working perfectly
2. **NOT A SUPABASE ISSUE**: This is purely local development server configuration  
3. **SIMPLE FIX**: Always use `./start-server.sh` to start your development server
4. **BULLETPROOF**: Our script eliminates the directory confusion problem forever

## 📈 **BENEFITS OF USING start-server.sh**:
- 🎯 **Zero Configuration**: Just run one command
- 🛡️ **Error Prevention**: Automatically checks everything
- 📊 **Clear Feedback**: Shows exactly what's happening
- ⚡ **Fast Startup**: Kills old servers and starts fresh
- 🔄 **Consistent**: Same behavior every time

---
**Remember**: Use `./start-server.sh` and you'll never have directory issues again! 🎉