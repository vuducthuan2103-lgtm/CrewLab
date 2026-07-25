import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.absolute()))

from sqlalchemy.schema import CreateTable
from sqlalchemy.dialects import postgresql
from app.core.db import engine, Base
import app.models

def dump_schema():
    with open('schema_dump.sql', 'w') as f:
        for table in Base.metadata.sorted_tables:
            f.write(str(CreateTable(table).compile(dialect=postgresql.dialect())) + ';\n')
            
if __name__ == '__main__':
    dump_schema()
