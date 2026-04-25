import pandas as pd
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
import os

# Configuration
URL = "https://ird.gov.np/pan-search/"
INVALID_MESSAGE = "अवैध जानकारी।"

def setup_driver():
    """Sets up the Chrome driver with human-like options in HEADLESS mode."""
    chrome_options = Options()
    chrome_options.add_argument("--headless") # Headless mode as requested
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    # Optimization for headless
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    # Anti-detection: mask webdriver
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    
    return driver

def run_pan_check(input_file, output_file, progress_cb=None):
    """
    Main checking logic refactored for GUI.
    progress_cb: function(current, total, message)
    """
    if not os.path.exists(input_file):
        if progress_cb: progress_cb(0, 1, f"Error: File {input_file} not found.")
        return False

    try:
        if progress_cb: progress_cb(5, 100, "Loading Excel file...")
        # Force PAN and Status to be strings to avoid float/NaN issues
        sheet1 = pd.read_excel(input_file, sheet_name='Sheet 1', dtype={'PAN': str, 'Status': str})
        # Replace NaN with empty string
        sheet1['Status'] = sheet1['Status'].fillna('')
        
        # Also load sheet 2 or create fresh if it doesn't exist
        try:
            sheet2 = pd.read_excel(input_file, sheet_name='Sheet 2', dtype=str)
        except:
            sheet2 = pd.DataFrame(columns=[
                'PAN', 'Name (Eng)', 'Name (Nep)', 'Address', 'Ward', 'Phone', 'Office', 
                'Effective Registration Date', 'Account Type', 'Filing Period', 'Main Business',
                'Status (Reg)', 'Fiscal Year', 'Return Verified Date', 'Status (Tax)'
            ])
        
        total_pans = len(sheet1)
        if total_pans == 0:
            if progress_cb: progress_cb(100, 100, "Excel file is empty.")
            return True

        if progress_cb: progress_cb(10, 100, "Starting Browser (Headless)...")
        driver = setup_driver()
        wait = WebDriverWait(driver, 10)
        
        try:
            driver.get(URL)
            
            for index, row in sheet1.iterrows():
                pan_no = str(row['PAN']).strip()
                
                # Progress update
                current_prog = 10 + int((index / total_pans) * 85)
                if progress_cb: progress_cb(current_prog, 100, f"Checking PAN: {pan_no}...")
                
                # Remove '.0' if it's treated as float
                if pan_no.endswith('.0'):
                    pan_no = pan_no[:-2]
                    
                if not pan_no or pan_no == 'nan' or pan_no == '':
                    continue
                
                # Find input and search button
                try:
                    pan_input = wait.until(EC.presence_of_element_located((By.ID, "pan")))
                    submit_btn = driver.find_element(By.ID, "submit")
                    
                    # Clear and type
                    pan_input.clear()
                    pan_input.send_keys(pan_no)
                    
                    # Click search
                    submit_btn.click()
                    
                    # Wait for any response
                    wait.until(lambda d: d.find_element(By.ID, "result").text.strip() != "" or 
                                         d.find_element(By.ID, "errdiv").text.strip() != "")
                    
                    result_text = driver.find_element(By.ID, "result").text
                    err_text = driver.find_element(By.ID, "errdiv").text
                    
                    if INVALID_MESSAGE in err_text:
                        sheet1.at[index, 'Status'] = 'Invalid'
                    elif "PAN Detail" in result_text or driver.find_elements(By.CSS_SELECTOR, "#result table"):
                        all_tables = driver.find_elements(By.CSS_SELECTOR, "#result table")
                        extracted_values = {}
                        
                        for table in all_tables:
                            rows = table.find_elements(By.TAG_NAME, "tr")
                            headers = table.find_elements(By.TAG_NAME, "th")
                            
                            # Vertical Case
                            for r in rows:
                                th_cells = r.find_elements(By.TAG_NAME, "th")
                                td_cells = r.find_elements(By.TAG_NAME, "td")
                                if len(th_cells) == 1 and len(td_cells) == 1:
                                    label = th_cells[0].text.strip()
                                    value = td_cells[0].get_attribute('innerHTML').strip()
                                    if label == "Status":
                                        extracted_values["Status (Tax)"] = value
                                    else:
                                        extracted_values[label] = value
                                        
                            # Horizontal Case
                            if len(headers) > 1:
                                header_labels = [h.text.strip() for h in headers]
                                data_rows = table.find_elements(By.CSS_SELECTOR, "tbody tr")
                                if data_rows:
                                    first_row_cells = data_rows[0].find_elements(By.TAG_NAME, "td")
                                    for i, cell in enumerate(first_row_cells):
                                        if i < len(header_labels):
                                            label = header_labels[i]
                                            value = cell.get_attribute('innerHTML').strip()
                                            if label == "Status":
                                                extracted_values["Status (Reg)"] = value
                                            else:
                                                extracted_values[label] = value
                                                
                        details = {
                            "PAN": pan_no,
                            "Name (Eng)": extracted_values.get("Name (Eng)", ""),
                            "Name (Nep)": extracted_values.get("Name (Nep)", ""),
                            "Address": extracted_values.get("Address", ""),
                            "Ward": extracted_values.get("Ward", ""),
                            "Phone": extracted_values.get("Phone", ""),
                            "Office": extracted_values.get("Office", ""),
                            "Effective Registration Date": extracted_values.get("Effective Registration Date", ""),
                            "Account Type": extracted_values.get("Account Type", ""),
                            "Filing Period": extracted_values.get("Filing Period", ""),
                            "Main Business": extracted_values.get("Main Business", ""),
                            "Status (Reg)": extracted_values.get("Status (Reg)", ""),
                            "Fiscal Year": extracted_values.get("Fiscal Year", ""),
                            "Return Verified Date": extracted_values.get("Return Verified Date", ""),
                            "Status (Tax)": extracted_values.get("Status (Tax)", "")
                        }
                        sheet2 = pd.concat([sheet2, pd.DataFrame([details])], ignore_index=True)
                        sheet1.at[index, 'Status'] = 'Valid'
                    else:
                        sheet1.at[index, 'Status'] = 'Unknown'
                
                except Exception as e:
                    sheet1.at[index, 'Status'] = f'Error: {str(e)[:20]}'
                
                # Next PAN
                driver.get(URL)

        finally:
            if progress_cb: progress_cb(95, 100, "Saving Results...")
            with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
                sheet1.to_excel(writer, sheet_name='Sheet 1', index=False)
                sheet2.to_excel(writer, sheet_name='Sheet 2', index=False)
            driver.quit()
            if progress_cb: progress_cb(100, 100, f"Done! Results saved to {os.path.basename(output_file)}")
            return True
            
    except Exception as e:
        if progress_cb: progress_cb(0, 100, f"Fatal Error: {str(e)}")
        return False

if __name__ == "__main__":
    # Test run
    run_pan_check('pan_list.xlsx', 'output.xlsx', lambda c, t, m: print(f"[{c}/{t}] {m}"))
