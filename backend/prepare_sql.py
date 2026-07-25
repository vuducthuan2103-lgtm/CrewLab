import re

with open('schema_dump.sql', 'r') as f:
    schema = f.read()

tables = re.findall(r'CREATE TABLE ([a-z_]+)', schema)

with open('alembic/rls_template.sql', 'r', encoding='utf-8') as f:
    rls_template = f.read()

with open('full_deploy.sql', 'w', encoding='utf-8') as f:
    f.write(schema)
    f.write('\n\n-- --- ENABLE RLS --- \n\n')
    for table in tables:
        policy = rls_template.replace('{table_name}', table)
        if table == 'clients':
            policy = policy.replace('client_id::text', 'id::text')
        f.write(policy + '\n')
