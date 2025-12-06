
'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Editor } from '@tiptap/react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function DraftTools({ editor }: { editor: Editor | null }) {
  if (!editor) return null

  return (
    <div className="h-full flex flex-col gap-4">
      <Card className="h-full flex flex-col border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0">
            <CardTitle className="text-lg">Drafting Tools</CardTitle>
        </CardHeader>
        <CardContent className="px-0 flex-1 min-h-0">
            <ScrollArea className="h-full pr-4">
                <Accordion type="multiple" defaultValue={["whereas", "clauses"]} className="w-full">
                    
                    <AccordionItem value="whereas">
                        <AccordionTrigger>Whereas Clauses</AccordionTrigger>
                        <AccordionContent>
                            <WhereasBuilder editor={editor} />
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="penalties">
                        <AccordionTrigger>Penalty Table Builder</AccordionTrigger>
                        <AccordionContent>
                            <PenaltyTableBuilder editor={editor} />
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="clauses">
                        <AccordionTrigger>Clause Library</AccordionTrigger>
                        <AccordionContent>
                            <ClauseLibrary editor={editor} />
                        </AccordionContent>
                    </AccordionItem>

                </Accordion>
            </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function WhereasBuilder({ editor }: { editor: Editor }) {
  const [clauses, setClauses] = useState<string[]>([''])

  const addClause = () => setClauses([...clauses, ''])
  const removeClause = (index: number) => setClauses(clauses.filter((_, i) => i !== index))
  const updateClause = (index: number, value: string) => {
    const newClauses = [...clauses]
    newClauses[index] = value
    setClauses(newClauses)
  }

  const insertClauses = () => {
    const html = clauses
      .filter(c => c.trim() !== '')
      .map(c => `<p><strong>WHEREAS</strong>, ${c};</p>`)
      .join('')
    
    editor.chain().focus().insertContent(html).run()
  }

  return (
    <div className="space-y-2">
      {clauses.map((clause, index) => (
        <div key={index} className="flex gap-2 items-center">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <Input 
                value={clause} 
                onChange={(e) => updateClause(index, e.target.value)} 
                placeholder="Reason for ordinance..."
                className="h-8 text-sm"
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeClause(index)}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
      ))}
      <div className="flex justify-between pt-2">
        <Button variant="outline" size="sm" onClick={addClause}><Plus className="h-3 w-3 mr-1"/> Add Clause</Button>
        <Button size="sm" onClick={insertClauses}>Insert to Doc</Button>
      </div>
    </div>
  )
}

function PenaltyTableBuilder({ editor }: { editor: Editor }) {
  const insertTable = () => {
     // Tiptap table insertion is complex via HTML string if not using the extension's command directly, 
     // but we can try inserting the HTML structure.
     const html = `
        <table>
          <tbody>
            <tr>
              <th colspan="1" rowspan="1"><p><strong>Offense</strong></p></th>
              <th colspan="1" rowspan="1"><p><strong>Fine (PHP)</strong></p></th>
              <th colspan="1" rowspan="1"><p><strong>Alternative Penalty</strong></p></th>
            </tr>
            <tr>
              <td colspan="1" rowspan="1"><p>1st Offense</p></td>
              <td colspan="1" rowspan="1"><p>P 500.00</p></td>
              <td colspan="1" rowspan="1"><p>Community Service (4 hrs)</p></td>
            </tr>
            <tr>
              <td colspan="1" rowspan="1"><p>2nd Offense</p></td>
              <td colspan="1" rowspan="1"><p>P 1,000.00</p></td>
              <td colspan="1" rowspan="1"><p>Community Service (8 hrs)</p></td>
            </tr>
            <tr>
              <td colspan="1" rowspan="1"><p>3rd Offense</p></td>
              <td colspan="1" rowspan="1"><p>P 2,500.00</p></td>
              <td colspan="1" rowspan="1"><p>Imprisonment / Court Action</p></td>
            </tr>
          </tbody>
        </table>
     `
     editor.chain().focus().insertContent(html).run()
  }

  return (
    <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Inserts a standard 3-column penalty table for 1st, 2nd, and 3rd offenses.</p>
        <Button size="sm" className="w-full" onClick={insertTable}>Insert Standard Penalty Table</Button>
    </div>
  )
}

function ClauseLibrary({ editor }: { editor: Editor }) {
    const clauses = [
        {
            title: "Separability Clause",
            content: "<p><strong>SECTION _. SEPARABILITY CLAUSE.</strong> If any provision of this Ordinance is declared invalid or unconstitutional, the remaining provisions not affected thereby shall continue to be in full force and effect.</p>"
        },
        {
            title: "Repealing Clause",
            content: "<p><strong>SECTION _. REPEALING CLAUSE.</strong> All ordinances, resolutions, rules and regulations or parts thereof inconsistent with the provisions of this Ordinance are hereby repealed or modified accordingly.</p>"
        },
        {
            title: "Effectivity Clause",
            content: "<p><strong>SECTION _. EFFECTIVITY.</strong> This Ordinance shall take effect immediately upon approval and posting in at least three (3) conspicuous places in the Barangay.</p>"
        }
    ]

    return (
        <div className="space-y-2">
            {clauses.map((c, i) => (
                <div key={i} className="border rounded p-2 bg-muted/20">
                    <p className="text-xs font-semibold mb-1">{c.title}</p>
                    <Button variant="secondary" size="sm" className="w-full h-6 text-xs" onClick={() => editor.chain().focus().insertContent(c.content).run()}>
                        Insert
                    </Button>
                </div>
            ))}
        </div>
    )
}
