import customtkinter as ctk
from tkinter import filedialog, messagebox
import threading
import os
import licensing
import pan_checker
from PIL import Image

# Appearance settings
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

class PanCheckApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Pan chck - Professional Suite")
        self.geometry("800x600")
        
        # Grid layout
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # Theme Colors
        self.RED = "#FF3B30"
        self.YELLOW = "#FFCC00"
        self.GREEN = "#34C759"

        # Check License on Startup
        self.is_active = False
        self.license_msg = "Checking license..."
        
        # Sidebar
        self.sidebar_frame = ctk.CTkFrame(self, width=200, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(4, weight=1)

        self.logo_label = ctk.CTkLabel(self.sidebar_frame, text="Pan chck", 
                                       font=ctk.CTkFont(size=24, weight="bold"),
                                       text_color=self.GREEN)
        self.logo_label.grid(row=0, column=0, padx=20, pady=(20, 10))

        self.home_button = ctk.CTkButton(self.sidebar_frame, text="Home", command=self.show_home)
        self.home_button.grid(row=1, column=0, padx=20, pady=10)

        self.license_button = ctk.CTkButton(self.sidebar_frame, text="License", command=self.show_license)
        self.license_button.grid(row=2, column=0, padx=20, pady=10)

        # Status indicator in sidebar
        self.status_ball = ctk.CTkLabel(self.sidebar_frame, text="●", text_color=self.RED)
        self.status_ball.grid(row=5, column=0, pady=(10, 0), padx=20, sticky="w")
        self.status_label = ctk.CTkLabel(self.sidebar_frame, text="Not Activated")
        self.status_label.grid(row=5, column=0, pady=(10, 0), padx=(40, 20), sticky="w")

        # Main Content Frames
        self.home_frame = ctk.CTkFrame(self, corner_radius=0, fg_color="transparent")
        self.license_frame = ctk.CTkFrame(self, corner_radius=0, fg_color="transparent")

        self.setup_home_frame()
        self.setup_license_frame()

        # Initialize State
        self.check_initial_license()
        self.show_home()

    def setup_home_frame(self):
        self.home_frame.grid_columnconfigure(0, weight=1)
        
        # Header
        self.header = ctk.CTkLabel(self.home_frame, text="PAN Verification Tool", 
                                   font=ctk.CTkFont(size=20, weight="bold"))
        self.header.grid(row=0, column=0, padx=20, pady=20)

        # File Selection
        self.file_frame = ctk.CTkFrame(self.home_frame)
        self.file_frame.grid(row=1, column=0, padx=20, pady=10, sticky="ew")
        self.file_frame.grid_columnconfigure(1, weight=1)

        self.select_btn = ctk.CTkButton(self.file_frame, text="Upload Excel", command=self.select_file,
                                        fg_color=self.YELLOW, text_color="black", hover_color="#E6B800")
        self.select_btn.grid(row=0, column=0, padx=10, pady=10)

        self.file_label = ctk.CTkLabel(self.file_frame, text="No file selected")
        self.file_label.grid(row=0, column=1, padx=10, pady=10, sticky="w")

        # Action Button
        self.start_btn = ctk.CTkButton(self.home_frame, text="Start Processing", command=self.start_processing,
                                       state="disabled", fg_color=self.GREEN, hover_color="#28A745")
        self.start_btn.grid(row=2, column=0, padx=20, pady=20)

        # Progress
        self.progress_bar = ctk.CTkProgressBar(self.home_frame)
        self.progress_bar.grid(row=3, column=0, padx=20, pady=10, sticky="ew")
        self.progress_bar.set(0)

        self.progress_label = ctk.CTkLabel(self.home_frame, text="Ready")
        self.progress_label.grid(row=4, column=0, padx=20, pady=0)

        # Console/Log
        self.log_box = ctk.CTkTextbox(self.home_frame, height=200)
        self.log_box.grid(row=5, column=0, padx=20, pady=20, sticky="nsew")
        self.log_box.insert("0.0", "Welcome to Pan chck.\nUpload an Excel sheet to begin.\n")

    def setup_license_frame(self):
        self.license_frame.grid_columnconfigure(0, weight=1)
        
        ctk.CTkLabel(self.license_frame, text="Software Activation", font=ctk.CTkFont(size=20, weight="bold")).grid(row=0, column=0, pady=20)
        
        self.hwid_label = ctk.CTkLabel(self.license_frame, text=f"Your Device ID: {licensing.get_hwid()}")
        self.hwid_label.grid(row=1, column=0, pady=10)

        self.key_entry = ctk.CTkEntry(self.license_frame, placeholder_text="Enter your License Key here...", width=400)
        self.key_entry.grid(row=2, column=0, pady=20, padx=20)

        self.activate_btn = ctk.CTkButton(self.license_frame, text="Activate Software", command=self.activate_license,
                                          fg_color=self.GREEN)
        self.activate_btn.grid(row=3, column=0, pady=10)

        self.license_info = ctk.CTkLabel(self.license_frame, text="Not Activated", text_color=self.RED)
        self.license_info.grid(row=4, column=0, pady=10)

    def check_initial_license(self):
        is_valid, msg = licensing.check_local_license()
        self.update_license_ui(is_valid, msg)

    def update_license_ui(self, is_valid, msg):
        self.is_active = is_valid
        if is_valid:
            self.status_ball.configure(text_color=self.GREEN)
            self.status_label.configure(text="Activated")
            self.license_info.configure(text=msg, text_color=self.GREEN)
            self.start_btn.configure(state="normal" if hasattr(self, 'selected_file') else "disabled")
        else:
            self.status_ball.configure(text_color=self.RED)
            self.status_label.configure(text="Not Activated")
            self.license_info.configure(text=msg, text_color=self.RED)
            self.start_btn.configure(state="disabled")

    def show_home(self):
        self.license_frame.grid_forget()
        self.home_frame.grid(row=0, column=1, sticky="nsew")

    def show_license(self):
        self.home_frame.grid_forget()
        self.license_frame.grid(row=0, column=1, sticky="nsew")

    def select_file(self):
        file = filedialog.askopenfilename(filetypes=[("Excel files", "*.xlsx")])
        if file:
            self.selected_file = file
            self.file_label.configure(text=os.path.basename(file))
            if self.is_active:
                self.start_btn.configure(state="normal")

    def activate_license(self):
        key = self.key_entry.get().strip()
        if not key:
            messagebox.showerror("Error", "Please enter a key.")
            return

        days = licensing.validate_activation(key)
        if days:
            licensing.save_activation_record(days)
            messagebox.showinfo("Success", f"Software activated for {days} days!")
            self.check_initial_license()
        else:
            messagebox.showerror("Error", "Invalid License Key.")

    def log(self, message):
        self.log_box.insert("end", f"[{threading.current_thread().name}] {message}\n")
        self.log_box.see("end")

    def progress_callback(self, current, total, message):
        # UI updates must be on main thread
        self.after(0, lambda: self.update_progress(current, total, message))

    def update_progress(self, current, total, message):
        self.progress_bar.set(current / total)
        self.progress_label.configure(text=message)
        self.log_box.insert("end", f"{message}\n")
        self.log_box.see("end")

    def start_processing(self):
        if not self.is_active:
            messagebox.showerror("Error", "Please activate the software first.")
            return
            
        output_file = filedialog.asksaveasfilename(defaultextension=".xlsx", 
                                                     initialfile="verified_pans.xlsx",
                                                     filetypes=[("Excel files", "*.xlsx")])
        if not output_file:
            return

        self.start_btn.configure(state="disabled")
        self.select_btn.configure(state="disabled")
        
        # Run in thread
        thread = threading.Thread(target=self.run_worker, args=(self.selected_file, output_file))
        thread.start()

    def run_worker(self, input_f, output_f):
        success = pan_checker.run_pan_check(input_f, output_f, self.progress_callback)
        self.after(0, self.finish_processing)

    def finish_processing(self):
        self.start_btn.configure(state="normal")
        self.select_btn.configure(state="normal")
        messagebox.showinfo("Finished", "Processing complete!")

if __name__ == "__main__":
    app = PanCheckApp()
    app.mainloop()
