import re

def main():
    with open(r'c:\Users\Admin\Desktop\vscode\random\data.js', encoding='utf-8') as f:
        data = f.read()
        
    print('NARIÑO in data:', 'NARIÑO' in data)
    print('NARI O in data:', 'NARI O' in data)
    print('NARIO in data:', 'NARIO' in data)
    
    depts = re.findall(r'"name": "([^"]+)"', data)
    print('Departments found in statistics:', depts)

if __name__ == '__main__':
    main()
